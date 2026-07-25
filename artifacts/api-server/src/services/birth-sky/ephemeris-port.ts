/**
 * EphemerisPort — permanent Birth Sky compute contract (server).
 * Consumers hydrate persisted AstronomyData; they never recompute on read.
 */

export type TimePrecision = "exact" | "approximate" | "unknown";
export type BirthSkyMode = "full" | "day_sky";

export type PlanetBodyId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune"
  | "pluto";

export type AstronomyBody = {
  id: PlanetBodyId | string;
  eclipticLongitudeDeg: number;
  sign: string;
};

export type PlanetPlacement = {
  id?: string;
  eclipticLongitudeDeg: number;
  sign: string;
  retrograde?: boolean;
};

export type HouseCusp = {
  house: number;
  sign: string;
  startLongitudeDeg: number;
  endLongitudeDeg: number;
};

export type HouseSystemData = {
  system: string;
  cusps: HouseCusp[];
};

export type PlanetHouseMap = Partial<Record<PlanetBodyId, number>>;

export type AstronomyData = {
  bodies: AstronomyBody[];
  sunSign: string;
  moonSign: string;
  moonPhase: string;
  moonPhaseLabel: string;
  risingSign: string | null;
  /** null on Day Sky / legacy snapshots; whole_sign object on new full charts. */
  houses: HouseSystemData | null;
  /** null when houses unavailable; planet id → house 1–12. */
  planetHouseMap?: PlanetHouseMap | null;
  precision: { timePrecision: TimePrecision; placeProvided: boolean };
  /** Present on remote-daemon writes; absent on legacy lite snapshots. */
  engineVersion?: string;
  /** Kernel label preserved for DE440/DE441 identity (also in metadata). */
  kernel?: string;
  /** sha256:… of the local BSP file at compute time. */
  kernelFingerprint?: string;
  generatedAt?: string;
  /** high | medium | legacy */
  quality?: string;
  /** 0–1 confidence from missing birth inputs (time/place). */
  astronomyConfidence?: number;
  missingInputs?: string[];
  /** topocentric | geocentric */
  calculationMode?: string;
  sun?: PlanetPlacement;
  moon?: PlanetPlacement;
  mercury?: PlanetPlacement;
  venus?: PlanetPlacement;
  mars?: PlanetPlacement;
  jupiter?: PlanetPlacement;
  saturn?: PlanetPlacement;
  uranus?: PlanetPlacement;
  neptune?: PlanetPlacement;
  pluto?: PlanetPlacement;
  ascendant?: { sign: string; eclipticLongitudeDeg: number } | null;
  planetDegrees?: Record<string, PlanetPlacement>;
  retrograde?: string[];
  metadata?: {
    julianDay?: number;
    utcIso?: string;
    topocentric?: boolean;
    bspKernel?: string;
    earthLongitudeDeg?: number;
    quality?: string;
    calculationSource?: string;
    kernel?: string;
    kernelFingerprint?: string;
    generatedAt?: string;
    precision?: string;
    astronomyConfidence?: number;
    missingInputs?: string[];
    calculationMode?: string;
    cacheHit?: boolean;
    computeLatencyMs?: number;
    houseSystem?: string | null;
  };
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
  compute(input: EphemerisComputeInput): Promise<EphemerisComputeResult>;
  buildCacheKey(input: EphemerisComputeInput): string;
};

export class EphemerisUnavailableError extends Error {
  readonly code = "ephemeris_unavailable";
  constructor(message = "Ephemeris daemon unavailable") {
    super(message);
    this.name = "EphemerisUnavailableError";
  }
}

export class EphemerisComputeError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "EphemerisComputeError";
    this.code = code;
  }
}
