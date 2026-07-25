/**
 * EphemerisPort — permanent Birth Sky compute contract (Phase 3 / Pack 3).
 *
 * Astronomical semantics for consumers are defined by this port’s I/O types
 * (`AstronomyData`, `BirthSkyMode`), not by any concrete engine binary.
 *
 * Rules (normative):
 * 1. All sky compute goes through EphemerisPort — never import adapters in UI.
 * 2. Committed SkySnapshots are immutable and engine-tagged via `engineVersion`.
 * 3. Readers MUST hydrate from persisted AstronomyData; they MUST NOT recompute
 *    when `engineVersion` differs from the currently bound adapter.
 * 4. Replacing the adapter (e.g. Swiss Ephemeris) changes only new writes;
 *    existing snapshots remain readable until explicit regenerate (Pack 4 A).
 */

import type { AstronomyData, BirthSkyMode } from "../models/birth-profile";
import type { TimePrecision } from "../models/setup-draft";

/** Stable input for any ephemeris adapter. */
export type EphemerisComputeInput = {
  birthDate: string;
  birthTime: string | null;
  timePrecision: TimePrecision;
  lat: number | null;
  lon: number | null;
  timezoneOffsetMinutes?: number | null;
};

export type EphemerisComputeResult = {
  mode: BirthSkyMode;
  astronomy: AstronomyData;
  /** Adapter identity — persisted on SkySnapshot.engineVersion */
  engineVersion: string;
};

/**
 * Permanent port. Implementations are swappable adapters.
 */
export type EphemerisPort = {
  /** Opaque adapter id, e.g. `amynest-astro-lite/1.0.0` or future Swiss id */
  readonly engineVersion: string;
  /**
   * True when this adapter is a temporary stand-in (not production Swiss).
   * UI/ops may surface this; product semantics of AstronomyData stay identical.
   */
  readonly isTemporaryAdapter: boolean;
  compute(input: EphemerisComputeInput): EphemerisComputeResult;
  buildCacheKey(input: EphemerisComputeInput): string;
};
