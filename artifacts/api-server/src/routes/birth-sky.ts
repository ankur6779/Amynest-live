/**
 * Birth Sky API — Create + snapshot compute (IM-1 / Pack 2–3).
 * No premium gate. No AI.
 */

import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  birthProfilesTable,
  skySnapshotsTable,
  childrenTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { requireBirthSkyAllowlist } from "../services/birth-sky/require-birth-sky-allowlist";
import { getEphemerisPort } from "../services/birth-sky/resolve-ephemeris-port";
import {
  migrateBirthProfileAtRestIfNeeded,
  plaintextBirthFields,
} from "../services/birth-sky/snapshot-service.js";
import {
  sealBirthPlace,
  sealBirthTime,
  unsealBirthPlace,
  unsealBirthTime,
} from "../services/birth-sky/birth-field-crypto.js";

const router: IRouter = Router();
router.use(requireBirthSkyAllowlist);

const placeSchema = z
  .object({
    label: z.string().min(1).max(500),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    timezoneIana: z.string().max(100).nullable().optional(),
    country: z.string().max(120).nullable().optional(),
    adminRegion: z.string().max(200).nullable().optional(),
  })
  .nullable();

const createSchema = z.object({
  childId: z.number().int().positive(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
  timePrecision: z.enum(["exact", "approximate", "unknown"]),
  birthPlace: placeSchema,
  placeSkipped: z.boolean().optional(),
  consent: z.object({
    consentVersion: z.string().min(1).max(64),
    acceptedAt: z.string().min(1),
    scopes: z.array(z.string()).min(1),
    disclaimerAccepted: z.literal(true),
  }),
});

function mapProfile(row: typeof birthProfilesTable.$inferSelect) {
  return {
    profileId: row.id,
    childId: row.childId,
    userId: row.userId,
    birthDate: row.birthDate,
    birthTime: unsealBirthTime(row.birthTime),
    timePrecision: row.timePrecision,
    birthPlace: unsealBirthPlace(row.birthPlace),
    consent: row.consent,
    aiInsightsUsedCount: row.aiInsightsUsedCount ?? 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapSnapshot(row: typeof skySnapshotsTable.$inferSelect) {
  return {
    snapshotId: row.id,
    profileId: row.profileId,
    cacheKey: row.cacheKey,
    snapshotVersion: row.snapshotVersion,
    engineVersion: row.engineVersion,
    computedAt: row.computedAt.toISOString(),
    mode: row.mode,
    astronomy: row.astronomy,
  };
}

async function assertChildOwned(userId: string, childId: number): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return Boolean(rows[0]);
}

function timezoneOffsetMinutes(iana: string | null | undefined, lon: number | null): number {
  if (iana) {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: iana,
        timeZoneName: "shortOffset",
      });
      const parts = fmt.formatToParts(new Date());
      const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
      const m = tz.match(/GMT([+-])(\d+)(?::(\d+))?/);
      if (m) {
        const sign = m[1] === "-" ? -1 : 1;
        const h = Number(m[2]);
        const min = Number(m[3] ?? "0");
        return sign * (h * 60 + min);
      }
    } catch {
      /* fall through */
    }
  }
  if (lon == null) return 0;
  return Math.round(lon / 15) * 60;
}

async function computeAndPersistSnapshot(params: {
  userId: string;
  profileId: string;
  birthDate: string;
  birthTime: string | null;
  timePrecision: "exact" | "approximate" | "unknown";
  birthPlace: z.infer<typeof placeSchema>;
}) {
  const lat = params.birthPlace?.lat ?? null;
  const lon = params.birthPlace?.lon ?? null;
  const offset = timezoneOffsetMinutes(params.birthPlace?.timezoneIana, lon);

  const ephemeris = getEphemerisPort();
  const input = {
    birthDate: params.birthDate,
    birthTime: params.birthTime,
    timePrecision: params.timePrecision,
    lat,
    lon,
    timezoneOffsetMinutes: offset,
  };
  const { mode, astronomy, engineVersion } = ephemeris.compute(input);
  const cacheKey = ephemeris.buildCacheKey(input);

  await db
    .update(skySnapshotsTable)
    .set({ isCurrent: false })
    .where(eq(skySnapshotsTable.profileId, params.profileId));

  const snapshotId = randomUUID();
  const snapshotVersion = `ss_${snapshotId}`;
  const [row] = await db
    .insert(skySnapshotsTable)
    .values({
      id: snapshotId,
      profileId: params.profileId,
      userId: params.userId,
      cacheKey,
      snapshotVersion,
      engineVersion,
      mode,
      astronomy,
      isCurrent: true,
      computedAt: new Date(),
    })
    .returning();

  return mapSnapshot(row!);
}

/**
 * GET /api/birth-sky/children/:childId
 */
router.get("/birth-sky/children/:childId", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId)) {
    res.status(400).json({ error: "invalid_child" });
    return;
  }
  try {
    if (!(await assertChildOwned(userId, childId))) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const profiles = await db
      .select()
      .from(birthProfilesTable)
      .where(
        and(
          eq(birthProfilesTable.userId, userId),
          eq(birthProfilesTable.childId, childId),
          isNull(birthProfilesTable.deletedAt),
        ),
      )
      .limit(1);
    const raw = profiles[0];
    if (!raw) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const profile = await migrateBirthProfileAtRestIfNeeded(raw);
    const snaps = await db
      .select()
      .from(skySnapshotsTable)
      .where(
        and(
          eq(skySnapshotsTable.profileId, profile.id),
          eq(skySnapshotsTable.isCurrent, true),
        ),
      )
      .limit(1);
    res.json({
      profile: mapProfile(profile),
      snapshot: snaps[0] ? mapSnapshot(snaps[0]) : null,
    });
  } catch (err) {
    logger.error(`birth-sky GET failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/birth-sky/create — free CreateBirthSky (Pack 2 §8).
 */
router.post("/birth-sky/create", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;

  if (body.timePrecision === "unknown" && body.birthTime != null) {
    res.status(400).json({ error: "time_must_be_null" });
    return;
  }
  if (body.timePrecision !== "unknown" && !body.birthTime) {
    res.status(400).json({ error: "time_required" });
    return;
  }
  if (!body.consent.disclaimerAccepted) {
    res.status(400).json({ error: "consent_required" });
    return;
  }

  try {
    if (!(await assertChildOwned(userId, body.childId))) {
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    const existing = await db
      .select()
      .from(birthProfilesTable)
      .where(
        and(
          eq(birthProfilesTable.userId, userId),
          eq(birthProfilesTable.childId, body.childId),
          isNull(birthProfilesTable.deletedAt),
        ),
      )
      .limit(1);

    const now = new Date();
    const consent = {
      ...body.consent,
      childId: body.childId,
      disclaimerAccepted: true as const,
    };
    const place = body.placeSkipped ? null : body.birthPlace;

    const sealedTime = sealBirthTime(body.birthTime);
    const sealedPlace = sealBirthPlace(place);

    let profileRow: typeof birthProfilesTable.$inferSelect;
    if (existing[0]) {
      const [updated] = await db
        .update(birthProfilesTable)
        .set({
          birthDate: body.birthDate,
          birthTime: sealedTime,
          timePrecision: body.timePrecision,
          birthPlace: sealedPlace,
          consent,
          updatedAt: now,
        })
        .where(eq(birthProfilesTable.id, existing[0].id))
        .returning();
      profileRow = updated!;
    } else {
      const [inserted] = await db
        .insert(birthProfilesTable)
        .values({
          id: randomUUID(),
          userId,
          childId: body.childId,
          birthDate: body.birthDate,
          birthTime: sealedTime,
          timePrecision: body.timePrecision,
          birthPlace: sealedPlace,
          consent,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      profileRow = inserted!;
    }

    try {
      const snapshot = await computeAndPersistSnapshot({
        userId,
        profileId: profileRow.id,
        birthDate: profileRow.birthDate,
        birthTime: body.birthTime,
        timePrecision: body.timePrecision as "exact" | "approximate" | "unknown",
        birthPlace: place,
      });
      res.json({
        profile: mapProfile(profileRow),
        snapshot,
        computeStatus: "ready",
      });
    } catch (computeErr) {
      logger.error(
        `birth-sky compute failed: ${computeErr instanceof Error ? computeErr.message : String(computeErr)}`,
      );
      res.json({
        profile: mapProfile(profileRow),
        snapshot: null,
        computeStatus: "failed",
        errorCode: "compute_failed",
      });
    }
  } catch (err) {
    logger.error(`birth-sky create failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/birth-sky/profiles/:profileId/recompute — Retry without re-consent.
 */
router.post("/birth-sky/profiles/:profileId/recompute", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const profileId = String(req.params.profileId ?? "");
  try {
    const profiles = await db
      .select()
      .from(birthProfilesTable)
      .where(
        and(
          eq(birthProfilesTable.id, profileId),
          eq(birthProfilesTable.userId, userId),
          isNull(birthProfilesTable.deletedAt),
        ),
      )
      .limit(1);
    const raw = profiles[0];
    if (!raw) {
      res.status(404).json({ error: "profile_missing" });
      return;
    }
    const profile = await migrateBirthProfileAtRestIfNeeded(raw);
    const plain = plaintextBirthFields(profile);
    const snapshot = await computeAndPersistSnapshot({
      userId,
      profileId: profile.id,
      birthDate: profile.birthDate,
      birthTime: plain.birthTime,
      timePrecision: profile.timePrecision as "exact" | "approximate" | "unknown",
      birthPlace: plain.birthPlace,
    });
    res.json({
      profile: mapProfile(profile),
      snapshot,
      computeStatus: "ready",
    });
  } catch (err) {
    logger.error(`birth-sky recompute failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({
      profile: null,
      snapshot: null,
      computeStatus: "failed",
      errorCode: "compute_failed",
    });
  }
});

export default router;
