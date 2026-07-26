/**
 * Snapshot compute + persist (append-only history; active pointer switch).
 */

import { and, eq, isNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  birthProfilesTable,
  skySnapshotsTable,
  childrenTable,
} from "@workspace/db";
import { withMeaningSnapshot } from "@workspace/birth-sky-meaning";
import { logger } from "../../lib/logger.js";
import { getEphemerisPort } from "./resolve-ephemeris-port.js";
import {
  profileNeedsAtRestMigration,
  sealBirthPlace,
  sealBirthTime,
  unsealBirthPlace,
  unsealBirthTime,
  type BirthPlacePlain,
} from "./birth-field-crypto.js";

export type PlaceInput = BirthPlacePlain | null;

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

export function mapSnapshotRow(row: typeof skySnapshotsTable.$inferSelect) {
  return {
    snapshotId: row.id,
    profileId: row.profileId,
    cacheKey: row.cacheKey,
    snapshotVersion: row.snapshotVersion,
    engineVersion: row.engineVersion,
    computedAt: row.computedAt.toISOString(),
    mode: row.mode,
    astronomy: row.astronomy,
    isCurrent: row.isCurrent,
  };
}

/** Map DB row → API profile with plaintext birth fields (unsealed). */
export function mapProfileRow(row: typeof birthProfilesTable.$inferSelect) {
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
    privacyPolicyVersion: row.privacyPolicyVersion ?? null,
    privacyAcceptedAt: row.privacyAcceptedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Lazy, idempotent migration: plaintext → AES-GCM at rest.
 * Safe to call on every read; no-op when already sealed.
 */
export async function migrateBirthProfileAtRestIfNeeded(
  row: typeof birthProfilesTable.$inferSelect,
): Promise<typeof birthProfilesTable.$inferSelect> {
  if (!profileNeedsAtRestMigration(row)) return row;
  const plainTime = unsealBirthTime(row.birthTime);
  const plainPlace = unsealBirthPlace(row.birthPlace);
  const sealedTime = sealBirthTime(plainTime);
  const sealedPlace = sealBirthPlace(plainPlace);
  const [updated] = await db
    .update(birthProfilesTable)
    .set({
      birthTime: sealedTime,
      birthPlace: sealedPlace,
      updatedAt: new Date(),
    })
    .where(eq(birthProfilesTable.id, row.id))
    .returning();
  return updated ?? { ...row, birthTime: sealedTime, birthPlace: sealedPlace };
}

export async function assertChildOwned(userId: string, childId: number): Promise<boolean> {
  const rows = await db
    .select({ id: childrenTable.id })
    .from(childrenTable)
    .where(and(eq(childrenTable.id, childId), eq(childrenTable.userId, userId)))
    .limit(1);
  return Boolean(rows[0]);
}

/**
 * Load owned profile and migrate legacy plaintext at rest if needed.
 * Returned row may still have sealed DB columns — use mapProfileRow / unseal* for plaintext.
 */
export async function loadOwnedProfile(userId: string, profileId: string) {
  const rows = await db
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
  const row = rows[0];
  if (!row) return null;
  return migrateBirthProfileAtRestIfNeeded(row);
}

/** Plaintext fields for compute paths (never pass sealed ciphertext to ephemeris). */
export function plaintextBirthFields(row: typeof birthProfilesTable.$inferSelect): {
  birthTime: string | null;
  birthPlace: PlaceInput;
} {
  return {
    birthTime: unsealBirthTime(row.birthTime),
    birthPlace: unsealBirthPlace(row.birthPlace),
  };
}

/** Creates a NEW snapshot row; never mutates historical astronomy payloads. */
export async function computeAndPersistSnapshot(params: {
  userId: string;
  profileId: string;
  birthDate: string;
  birthTime: string | null;
  timePrecision: "exact" | "approximate" | "unknown";
  birthPlace: PlaceInput;
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
  const t0 = Date.now();
  const { mode, astronomy: rawAstronomy, engineVersion } = await ephemeris.compute(input);
  // Meaning layer — does not alter ephemeris math; additive semantic snapshot.
  const astronomy = withMeaningSnapshot(rawAstronomy);
  const durationMs = Date.now() - t0;
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

  const meta = astronomy.metadata ?? {};
  const engineName = engineVersion.includes("/")
    ? engineVersion.split("/")[0]
    : engineVersion;
  logger.info(
    {
      event: "ephemeris_compute",
      engine: engineName,
      kernel: astronomy.kernel ?? meta.kernel ?? null,
      kernelFingerprint: astronomy.kernelFingerprint ?? meta.kernelFingerprint ?? null,
      latencyMs: meta.computeLatencyMs ?? durationMs,
      cacheHit: Boolean(meta.cacheHit),
      chartId: snapshotId,
      durationMs,
      mode,
      engineVersion,
    },
    "ephemeris_compute",
  );

  return mapSnapshotRow(row!);
}
