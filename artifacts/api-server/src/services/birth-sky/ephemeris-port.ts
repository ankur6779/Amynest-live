/**
 * EphemerisPort — permanent Birth Sky compute contract (server).
 * Consumers hydrate persisted AstronomyData; they never recompute on read.
 */

export type TimePrecision = "exact" | "approximate" | "unknown";
export type BirthSkyMode = "full" | "day_sky";

export type AstronomyData = {
  bodies: Array<{ id: "sun" | "moon"; eclipticLongitudeDeg: number; sign: string }>;
  sunSign: string;
  moonSign: string;
  moonPhase: string;
  moonPhaseLabel: string;
  risingSign: string | null;
  houses: null;
  precision: { timePrecision: TimePrecision; placeProvided: boolean };
};

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
  compute(input: EphemerisComputeInput): EphemerisComputeResult;
  buildCacheKey(input: EphemerisComputeInput): string;
};
