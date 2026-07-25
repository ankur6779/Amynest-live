/**
 * Snapshot forward-compatibility (Pack 3 A / Pack 4 A).
 *
 * Existing snapshots remain readable across ephemeris adapter replacements.
 * Hydration never requires the producing engine to still be bound.
 */

import type { AstronomyData, BirthSkyMode, SkySnapshot } from "./birth-profile";

const MODES = new Set<BirthSkyMode>(["full", "day_sky"]);

export type SnapshotReadResult =
  | { ok: true; snapshot: SkySnapshot }
  | { ok: false; reason: string };

function isAstronomyData(value: unknown): value is AstronomyData {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.sunSign === "string" &&
    typeof a.moonSign === "string" &&
    typeof a.moonPhase === "string" &&
    typeof a.moonPhaseLabel === "string" &&
    Array.isArray(a.bodies) &&
    a.precision != null &&
    typeof a.precision === "object"
  );
}

/**
 * Validate/hydrate a persisted snapshot for Reveal/Dashboard readers.
 * Does not invoke EphemerisPort. Tolerates any `engineVersion` string.
 */
export function hydrateSkySnapshot(raw: unknown): SnapshotReadResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "snapshot_missing" };
  }
  const s = raw as Record<string, unknown>;
  if (typeof s.snapshotId !== "string" || typeof s.profileId !== "string") {
    return { ok: false, reason: "snapshot_identity_invalid" };
  }
  if (typeof s.engineVersion !== "string" || !s.engineVersion) {
    return { ok: false, reason: "engine_version_missing" };
  }
  if (typeof s.snapshotVersion !== "string" || !s.snapshotVersion) {
    return { ok: false, reason: "snapshot_version_missing" };
  }
  if (typeof s.mode !== "string" || !MODES.has(s.mode as BirthSkyMode)) {
    return { ok: false, reason: "mode_invalid" };
  }
  if (!isAstronomyData(s.astronomy)) {
    return { ok: false, reason: "astronomy_payload_invalid" };
  }

  return {
    ok: true,
    snapshot: {
      snapshotId: s.snapshotId,
      profileId: s.profileId,
      cacheKey: typeof s.cacheKey === "string" ? s.cacheKey : "",
      snapshotVersion: s.snapshotVersion,
      engineVersion: s.engineVersion,
      computedAt: typeof s.computedAt === "string" ? s.computedAt : new Date(0).toISOString(),
      mode: s.mode as BirthSkyMode,
      astronomy: s.astronomy,
    },
  };
}

/** True when a snapshot can be shown without recompute (engine may be retired). */
export function isSnapshotReadableWithoutEngine(snapshot: SkySnapshot): boolean {
  return hydrateSkySnapshot(snapshot).ok;
}
