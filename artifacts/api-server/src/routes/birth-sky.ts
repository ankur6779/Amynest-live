/**
 * Birth Sky API — Create + snapshot compute (IM-1 / Pack 2–3).
 * No premium gate. First-run create is resilient (retry + lite fallback).
 */

import { Router, type IRouter } from "express";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  birthProfilesTable,
  skySnapshotsTable,
} from "@workspace/db";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import { requireBirthSkyAllowlist } from "../services/birth-sky/require-birth-sky-allowlist";
import {
  assertChildOwned,
  computeAndPersistSnapshotWithRetry,
  ensureBirthSkyPreferences,
  ensureGenerationStatusColumn,
  generationStatusToComputeStatus,
  logBirthSkyPipeline,
  mapProfileRow,
  mapSnapshotRow,
  migrateBirthProfileAtRestIfNeeded,
  plaintextBirthFields,
  setGenerationStatus,
  shouldExposeCurrentSnapshot,
  type GenerationStatus,
} from "../services/birth-sky/snapshot-service.js";
import {
  sealBirthPlace,
  sealBirthTime,
} from "../services/birth-sky/birth-field-crypto.js";

function snapshotFallbackUsed(snapshot: {
  astronomy?: unknown;
}): boolean {
  const astronomy = snapshot.astronomy as
    | { metadata?: { fallbackUsed?: boolean } }
    | null
    | undefined;
  return Boolean(astronomy?.metadata?.fallbackUsed);
}

function createResponsePayload(input: {
  profile: ReturnType<typeof mapProfileRow>;
  snapshot: ReturnType<typeof mapSnapshotRow> | null;
  generationStatus: GenerationStatus;
  errorCode?: string;
}) {
  return {
    profile: {
      ...input.profile,
      generationStatus: input.generationStatus,
    },
    // Never claim a persisted snapshot when status is not READY.
    snapshot: input.generationStatus === "READY" ? input.snapshot : null,
    computeStatus: generationStatusToComputeStatus(input.generationStatus),
    generationStatus: input.generationStatus,
    fallbackUsed: input.snapshot ? snapshotFallbackUsed(input.snapshot) : false,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
  };
}

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
    const mappedProfile = mapProfileRow(profile);
    const currentSnap = snaps[0] ? mapSnapshotRow(snaps[0]) : null;
    res.json({
      profile: mappedProfile,
      snapshot: shouldExposeCurrentSnapshot(
        mappedProfile.generationStatus,
        Boolean(currentSnap),
      )
        ? currentSnap
        : null,
    });
  } catch (err) {
    logger.error(`birth-sky GET failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

/**
 * POST /api/birth-sky/create — free CreateBirthSky (Pack 2 §8).
 *
 * Pipeline: validate → ensure prefs → upsert profile → astro generate (+retry/fallback)
 * → attach meaning → save snapshot.
 */
router.post("/birth-sky/create", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    logBirthSkyPipeline(
      "birth_data_invalid",
      { userId, issues: parsed.error.flatten() },
      "warn",
    );
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
    logBirthSkyPipeline("create_start", {
      userId,
      childId: body.childId,
      timePrecision: body.timePrecision,
      placeSkipped: Boolean(body.placeSkipped),
      placeProvided: Boolean(body.birthPlace),
    });

    if (!(await assertChildOwned(userId, body.childId))) {
      logBirthSkyPipeline("child_not_found", { userId, childId: body.childId }, "warn");
      res.status(404).json({ error: "child_not_found" });
      return;
    }

    // Profile init: preferences + generation_status column (idempotent).
    await ensureBirthSkyPreferences(userId);
    await ensureGenerationStatusColumn();
    logBirthSkyPipeline("preferences_ensured", { userId });

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
      await setGenerationStatus(profileRow.id, "COMPUTING");
      logBirthSkyPipeline("profile_upserted", {
        userId,
        profileId: profileRow.id,
        childId: body.childId,
        created: false,
        generationStatus: "COMPUTING",
      });
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
      await setGenerationStatus(profileRow.id, "COMPUTING");
      logBirthSkyPipeline("profile_upserted", {
        userId,
        profileId: profileRow.id,
        childId: body.childId,
        created: true,
        generationStatus: "COMPUTING",
      });
    }

    try {
      const snapshot = await computeAndPersistSnapshotWithRetry({
        userId,
        profileId: profileRow.id,
        birthDate: profileRow.birthDate,
        birthTime: body.birthTime,
        timePrecision: body.timePrecision as "exact" | "approximate" | "unknown",
        birthPlace: place,
      });
      // Refresh profile so generationStatus=READY is reflected.
      const refreshed = await migrateBirthProfileAtRestIfNeeded(profileRow);
      logBirthSkyPipeline("create_ready", {
        userId,
        profileId: profileRow.id,
        snapshotId: snapshot.snapshotId,
        engineVersion: snapshot.engineVersion,
        fallbackUsed: snapshotFallbackUsed(snapshot),
        generationStatus: "READY",
      });
      res.json(
        createResponsePayload({
          profile: mapProfileRow(refreshed),
          snapshot,
          generationStatus: "READY",
        }),
      );
    } catch (computeErr) {
      await setGenerationStatus(profileRow.id, "FAILED");
      logBirthSkyPipeline(
        "create_compute_failed",
        {
          userId,
          profileId: profileRow.id,
          error: computeErr instanceof Error ? computeErr.message : String(computeErr),
          code:
            computeErr &&
            typeof computeErr === "object" &&
            "code" in computeErr
              ? (computeErr as { code?: string }).code
              : undefined,
          generationStatus: "FAILED",
        },
        "error",
      );
      const code =
        computeErr &&
        typeof computeErr === "object" &&
        "code" in computeErr &&
        (computeErr as { code?: string }).code === "ephemeris_unavailable"
          ? "ephemeris_unavailable"
          : "compute_failed";
      // Profile may exist for recovery — but never persist a null snapshot row.
      res.json(
        createResponsePayload({
          profile: mapProfileRow({ ...profileRow, generationStatus: "FAILED" }),
          snapshot: null,
          generationStatus: "FAILED",
          errorCode: code,
        }),
      );
    }
  } catch (err) {
    logger.error(`birth-sky create failed: ${err instanceof Error ? err.message : String(err)}`);
    logBirthSkyPipeline(
      "create_server_error",
      { userId, error: err instanceof Error ? err.message : String(err) },
      "error",
    );
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
    logBirthSkyPipeline("recompute_start", { userId, profileId });
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
      logBirthSkyPipeline("profile_missing", { userId, profileId }, "warn");
      res.status(404).json({ error: "profile_missing" });
      return;
    }
    const profile = await migrateBirthProfileAtRestIfNeeded(raw);
    await ensureBirthSkyPreferences(userId);
    await setGenerationStatus(profile.id, "COMPUTING");
    const plain = plaintextBirthFields(profile);
    if (!profile.birthDate) {
      await setGenerationStatus(profile.id, "FAILED");
      logBirthSkyPipeline("missing_birth_data", { userId, profileId }, "warn");
      res.status(400).json(
        createResponsePayload({
          profile: mapProfileRow({ ...profile, generationStatus: "FAILED" }),
          snapshot: null,
          generationStatus: "FAILED",
          errorCode: "missing_birth_data",
        }),
      );
      return;
    }
    const snapshot = await computeAndPersistSnapshotWithRetry({
      userId,
      profileId: profile.id,
      birthDate: profile.birthDate,
      birthTime: plain.birthTime,
      timePrecision: profile.timePrecision as "exact" | "approximate" | "unknown",
      birthPlace: plain.birthPlace,
    });
    const refreshed = await migrateBirthProfileAtRestIfNeeded(profile);
    logBirthSkyPipeline("recompute_ready", {
      userId,
      profileId,
      snapshotId: snapshot.snapshotId,
      engineVersion: snapshot.engineVersion,
      fallbackUsed: snapshotFallbackUsed(snapshot),
      generationStatus: "READY",
    });
    res.json(
      createResponsePayload({
        profile: mapProfileRow(refreshed),
        snapshot,
        generationStatus: "READY",
      }),
    );
  } catch (err) {
    logger.error(`birth-sky recompute failed: ${err instanceof Error ? err.message : String(err)}`);
    if (profileId) {
      try {
        await setGenerationStatus(profileId, "FAILED");
      } catch {
        /* ignore */
      }
    }
    const code =
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "ephemeris_unavailable"
        ? "ephemeris_unavailable"
        : "compute_failed";
    logBirthSkyPipeline(
      "recompute_failed",
      { userId, profileId, errorCode: code, generationStatus: "FAILED" },
      "error",
    );
    res.status(500).json({
      profile: null,
      snapshot: null,
      computeStatus: "failed",
      generationStatus: "FAILED",
      fallbackUsed: false,
      errorCode: code,
    });
  }
});

export default router;
