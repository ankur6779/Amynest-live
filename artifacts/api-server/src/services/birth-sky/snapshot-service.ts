/**
 * Snapshot compute + persist (append-only history; active pointer switch).
 */

import { and, eq, isNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  birthProfilesTable,
  skySnapshotsTable,
  childrenTable,
  birthSkyPreferencesTable,
} from "@workspace/db";
import {
  computeMeaningSnapshot,
  type MeaningAstronomyInput,
} from "@workspace/birth-sky-meaning";
import { logger } from "../../lib/logger.js";
import { getEphemerisPort } from "./resolve-ephemeris-port.js";
import type { AstronomyData } from "./ephemeris-port.js";
import { attachChartDetails } from "./chart-details.js";
import {
  profileNeedsAtRestMigration,
  sealBirthPlace,
  sealBirthTime,
  unsealBirthPlace,
  unsealBirthTime,
  type BirthPlacePlain,
} from "./birth-field-crypto.js";

/** Structured first-sky / compute pipeline log (never logs raw birth secrets). */
export function logBirthSkyPipeline(
  step: string,
  fields: Record<string, unknown>,
  level: "info" | "warn" | "error" = "info",
): void {
  const payload = {
    event: "birth_sky.pipeline",
    step,
    ...fields,
  };
  if (level === "error") logger.error(payload, `birth_sky.pipeline.${step}`);
  else if (level === "warn") logger.warn(payload, `birth_sky.pipeline.${step}`);
  else logger.info(payload, `birth_sky.pipeline.${step}`);
}

/** Ensure preference row exists for a user (idempotent). */
export async function ensureBirthSkyPreferences(userId: string): Promise<void> {
  const existing = await db
    .select({ userId: birthSkyPreferencesTable.userId })
    .from(birthSkyPreferencesTable)
    .where(eq(birthSkyPreferencesTable.userId, userId))
    .limit(1);
  if (existing[0]) return;
  await db.insert(birthSkyPreferencesTable).values({
    userId,
    showTradition: true,
    skySounds: true,
    monthlyNotesOptIn: true,
    updatedAt: new Date(),
  });
}

export type PlaceInput = BirthPlacePlain | null;

/** Narrow ephemeris payload for Meaning Engine without dropping AstronomyData fields. */
function toMeaningAstronomyInput(a: AstronomyData): MeaningAstronomyInput {
  const western = a.westernBirthProfile;
  return {
    sunSign: a.sunSign,
    moonSign: a.moonSign,
    risingSign: a.risingSign,
    moonPhase: a.moonPhase,
    astrologyMode: a.astrologyMode ?? a.metadata?.astrologyMode ?? null,
    zodiacMode: a.zodiacMode ?? a.metadata?.zodiacMode ?? null,
    sun: a.sun ?? null,
    moon: a.moon ?? null,
    mercury: a.mercury ?? a.planetDegrees?.mercury ?? null,
    venus: a.venus ?? a.planetDegrees?.venus ?? null,
    mars: a.mars ?? a.planetDegrees?.mars ?? null,
    jupiter: a.jupiter ?? a.planetDegrees?.jupiter ?? null,
    saturn: a.saturn ?? a.planetDegrees?.saturn ?? null,
    planetHouseMap: a.planetHouseMap ?? null,
    aspects: a.aspects ?? null,
    moonProfile: a.moonProfile ?? null,
    nakshatra: a.nakshatra ?? null,
    dasha: a.dasha ?? null,
    westernBirthProfile: western
      ? {
          dominantElement:
            typeof western.dominantElement === "string"
              ? western.dominantElement
              : undefined,
          dominantModality:
            typeof western.dominantModality === "string"
              ? western.dominantModality
              : undefined,
        }
      : null,
  };
}

function attachMeaningSnapshot(raw: AstronomyData): AstronomyData {
  const meaningSnapshot = computeMeaningSnapshot(toMeaningAstronomyInput(raw));
  return {
    ...raw,
    meaningSnapshot: meaningSnapshot as unknown as Record<string, unknown>,
  };
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

export type GenerationStatus = "PENDING" | "COMPUTING" | "READY" | "FAILED";

export function normalizeGenerationStatus(
  value: string | null | undefined,
): GenerationStatus {
  const s = String(value ?? "PENDING").toUpperCase();
  if (s === "PENDING" || s === "COMPUTING" || s === "READY" || s === "FAILED") {
    return s;
  }
  return "PENDING";
}

export function generationStatusToComputeStatus(
  status: GenerationStatus,
): "pending" | "computing" | "ready" | "failed" {
  switch (status) {
    case "PENDING":
      return "pending";
    case "COMPUTING":
      return "computing";
    case "READY":
      return "ready";
    case "FAILED":
      return "failed";
  }
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
    generationStatus: normalizeGenerationStatus(
      (row as { generationStatus?: string | null }).generationStatus,
    ),
    privacyPolicyVersion: row.privacyPolicyVersion ?? null,
    privacyAcceptedAt: row.privacyAcceptedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

let generationStatusColumnReady: boolean | null = null;

/**
 * Idempotent schema ensure for Coolify hosts that have not yet run db:push.
 * Safe to call on every create/recompute — no-ops after first success.
 */
export async function ensureGenerationStatusColumn(): Promise<boolean> {
  if (generationStatusColumnReady === true) return true;
  try {
    await db.execute(
      sql`ALTER TABLE birth_profiles ADD COLUMN IF NOT EXISTS generation_status text NOT NULL DEFAULT 'PENDING'`,
    );
    generationStatusColumnReady = true;
    return true;
  } catch (err) {
    generationStatusColumnReady = false;
    logBirthSkyPipeline(
      "generation_status_column_ensure_failed",
      { error: err instanceof Error ? err.message : String(err) },
      "warn",
    );
    return false;
  }
}

export async function setGenerationStatus(
  profileId: string,
  status: GenerationStatus,
): Promise<void> {
  const ready = await ensureGenerationStatusColumn();
  if (!ready) return;
  try {
    await db
      .update(birthProfilesTable)
      .set({ generationStatus: status, updatedAt: new Date() })
      .where(eq(birthProfilesTable.id, profileId));
  } catch (err) {
    // Never block Sky generation on status bookkeeping.
    logBirthSkyPipeline(
      "generation_status_update_failed",
      {
        profileId,
        status,
        error: err instanceof Error ? err.message : String(err),
      },
      "warn",
    );
  }
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

  logBirthSkyPipeline("astro_generation_start", {
    userId: params.userId,
    profileId: params.profileId,
    timePrecision: params.timePrecision,
    placeProvided: lat != null && lon != null,
    hasBirthTime: Boolean(params.birthTime),
  });

  const t0 = Date.now();
  let rawAstronomy: AstronomyData;
  let mode: "full" | "day_sky";
  let engineVersion: string;
  try {
    const computed = await ephemeris.compute(input);
    mode = computed.mode;
    rawAstronomy = computed.astronomy;
    engineVersion = computed.engineVersion;
  } catch (err) {
    logBirthSkyPipeline(
      "astro_generation_failed",
      {
        userId: params.userId,
        profileId: params.profileId,
        durationMs: Date.now() - t0,
        error: err instanceof Error ? err.message : String(err),
        code: err && typeof err === "object" && "code" in err ? (err as { code?: string }).code : undefined,
      },
      "error",
    );
    throw err;
  }

  if (!rawAstronomy?.sunSign || !rawAstronomy?.moonSign) {
    logBirthSkyPipeline(
      "astro_generation_empty",
      { userId: params.userId, profileId: params.profileId },
      "error",
    );
    throw new Error("empty_astro_response");
  }

  // Meaning + Vedic chart-detail layers — additive; never alter ephemeris math.
  let astronomy: AstronomyData;
  try {
    astronomy = attachMeaningSnapshot(rawAstronomy);
    logBirthSkyPipeline("ai_context_attached", {
      userId: params.userId,
      profileId: params.profileId,
      hasMeaning: Boolean(astronomy.meaningSnapshot),
    });
  } catch (meaningErr) {
    // Meaning is additive — never block first Sky on meaning failures.
    logBirthSkyPipeline(
      "ai_context_attach_failed",
      {
        userId: params.userId,
        profileId: params.profileId,
        error: meaningErr instanceof Error ? meaningErr.message : String(meaningErr),
      },
      "warn",
    );
    astronomy = rawAstronomy;
  }
  try {
    astronomy = attachChartDetails(astronomy);
    logBirthSkyPipeline("chart_details_attached", {
      userId: params.userId,
      profileId: params.profileId,
      completeness: astronomy.chartCompleteness?.status,
      houseCount: Array.isArray(astronomy.houseDetails) ? astronomy.houseDetails.length : 0,
      planetCount: Array.isArray(astronomy.planetDetails) ? astronomy.planetDetails.length : 0,
    });
  } catch (chartErr) {
    logBirthSkyPipeline(
      "chart_details_attach_failed",
      {
        userId: params.userId,
        profileId: params.profileId,
        error: chartErr instanceof Error ? chartErr.message : String(chartErr),
      },
      "warn",
    );
  }

  const durationMs = Date.now() - t0;
  const cacheKey = ephemeris.buildCacheKey(input);
  const fallbackUsed = Boolean(astronomy.metadata?.fallbackUsed);

  // Atomically retire prior isCurrent rows and insert the new pointer — never leave
  // the profile with zero active snapshots if INSERT fails after deactivate.
  const snapshotId = randomUUID();
  const snapshotVersion = `ss_${snapshotId}`;
  const row = await db.transaction(async (tx) => {
    await tx
      .update(skySnapshotsTable)
      .set({ isCurrent: false })
      .where(eq(skySnapshotsTable.profileId, params.profileId));

    const [inserted] = await tx
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

    if (!inserted) {
      throw new Error("snapshot_persist_failed");
    }
    return inserted;
  });

  await setGenerationStatus(params.profileId, "READY");

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
      fallbackUsed,
      chartId: snapshotId,
      durationMs,
      mode,
      engineVersion,
    },
    "ephemeris_compute",
  );

  logBirthSkyPipeline("snapshot_saved", {
    userId: params.userId,
    profileId: params.profileId,
    snapshotId,
    snapshotVersion,
    engineVersion,
    mode,
    durationMs,
    fallbackUsed,
    generationStatus: "READY",
  });

  return mapSnapshotRow(row);
}

/**
 * Compute with one outer retry for transient persist/compute failures.
 * Used by first-run create so recoverable errors never surface as Sky paused.
 */
export async function computeAndPersistSnapshotWithRetry(params: {
  userId: string;
  profileId: string;
  birthDate: string;
  birthTime: string | null;
  timePrecision: "exact" | "approximate" | "unknown";
  birthPlace: PlaceInput;
}): Promise<ReturnType<typeof mapSnapshotRow>> {
  try {
    return await computeAndPersistSnapshot(params);
  } catch (firstErr) {
    logBirthSkyPipeline(
      "astro_generation_retry",
      {
        userId: params.userId,
        profileId: params.profileId,
        error: firstErr instanceof Error ? firstErr.message : String(firstErr),
      },
      "warn",
    );
    return computeAndPersistSnapshot(params);
  }
}
