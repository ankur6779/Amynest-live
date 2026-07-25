/**
 * EphemerisPort — permanent Birth Sky compute contract.
 *
 * Production compute runs on the API remote ephemeris daemon. The browser must
 * not call compute — it hydrates persisted AstronomyData only.
 */

import type { AstronomyData, BirthSkyMode } from "../models/birth-profile";
import type { TimePrecision } from "../models/setup-draft";

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
  engineVersion: string;
};

export type EphemerisPort = {
  readonly engineVersion: string;
  readonly isTemporaryAdapter: boolean;
  compute(input: EphemerisComputeInput): Promise<EphemerisComputeResult>;
  buildCacheKey(input: EphemerisComputeInput): string;
};
