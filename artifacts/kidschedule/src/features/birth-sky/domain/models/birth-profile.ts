import type { BirthPlaceDraft, TimePrecision } from "./setup-draft";

export type BirthSkyMode = "full" | "day_sky";

export type BirthProfileConsent = {
  consentVersion: string;
  acceptedAt: string;
  scopes: string[];
  disclaimerAccepted: true;
  childId: number;
};

export type BirthProfile = {
  profileId: string;
  childId: number;
  userId: string;
  birthDate: string;
  birthTime: string | null;
  timePrecision: TimePrecision;
  birthPlace: BirthPlaceDraft | null;
  consent: BirthProfileConsent;
  /** Server mirror — Pack 2 free AI quota (do not increment locally). */
  aiInsightsUsedCount?: number;
  /** Pack 7 Addendum A — legal/privacy policy version last accepted. */
  privacyPolicyVersion?: string | null;
  privacyAcceptedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

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

export type PlanetHouseMap = Partial<
  Record<
    | "sun"
    | "moon"
    | "mercury"
    | "venus"
    | "mars"
    | "jupiter"
    | "saturn"
    | "uranus"
    | "neptune"
    | "pluto",
    number
  >
>;

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
  precision: {
    timePrecision: TimePrecision;
    placeProvided: boolean;
  };
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

export type SkySnapshot = {
  snapshotId: string;
  profileId: string;
  cacheKey: string;
  snapshotVersion: string;
  engineVersion: string;
  computedAt: string;
  mode: BirthSkyMode;
  astronomy: AstronomyData;
};

export function deriveSkyMode(timePrecision: TimePrecision): BirthSkyMode {
  return timePrecision === "unknown" ? "day_sky" : "full";
}

/**
 * Expected engineVersion string for new server writes (opaque tag from daemon).
 * Client never computes — this is documentation / certification only.
 */
export const BIRTH_SKY_ENGINE_VERSION_WRITES = "skyfield-jpl/1.0.0";
