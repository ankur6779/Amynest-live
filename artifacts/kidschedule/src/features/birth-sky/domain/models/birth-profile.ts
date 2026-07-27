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
  /** Snapshot generation lifecycle: PENDING | COMPUTING | READY | FAILED */
  generationStatus?: "PENDING" | "COMPUTING" | "READY" | "FAILED";
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
  degreeInSign?: number;
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
    | "pluto"
    | "rahu"
    | "ketu",
    number
  >
>;

export type NakshatraPlacement = {
  name: string;
  index: number;
  pada: number;
  lord: string;
  longitudeInNakshatraDeg: number;
  startLongitudeDeg?: number;
  endLongitudeDeg?: number;
};

export type MoonProfile = {
  sign: string;
  house?: number | null;
  nakshatra: string;
  pada: number;
  lord: string;
  phase: string;
  phaseLabel: string;
  longitudeDeg?: number;
  degreeInSign?: number;
};

export type VimshottariDasha = {
  system: string;
  mahadasha: {
    lord: string;
    startUtc: string;
    endUtc: string;
    fullYears?: number;
    balanceYearsAtBirth?: number;
  };
  antardasha: {
    lord: string;
    startUtc: string;
    endUtc: string;
  };
  remainingBalance: {
    mahadashaYears: number;
    antardashaYears: number;
  };
  birthNakshatra?: string;
  birthNakshatraLord?: string;
  birthPada?: number;
};

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
  /** vedic | western — absent on legacy snapshots. */
  astrologyMode?: string;
  /** tropical | sidereal_lahiri — absent on legacy snapshots. */
  zodiacMode?: string;
  ayanamsa?: number | null;
  ayanamsaName?: string | null;
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
  rahu?: PlanetPlacement;
  ketu?: PlanetPlacement;
  ascendant?: { sign: string; eclipticLongitudeDeg: number; degreeInSign?: number } | null;
  midheaven?: { sign: string; eclipticLongitudeDeg: number; degreeInSign?: number } | null;
  imumCoeli?: { sign: string; eclipticLongitudeDeg: number; degreeInSign?: number } | null;
  descendant?: { sign: string; eclipticLongitudeDeg: number; degreeInSign?: number } | null;
  planetDegrees?: Record<string, PlanetPlacement>;
  retrograde?: string[];
  aspects?: Array<{
    planetA: string;
    planetB: string;
    aspect: string;
    angle: number;
    orb: number;
    exactness: number;
  }> | null;
  westernBirthProfile?: {
    sun?: { sign?: string; longitudeDeg?: number; house?: number | null; retrograde?: boolean } | null;
    moon?: { sign?: string; longitudeDeg?: number; house?: number | null; retrograde?: boolean } | null;
    ascendant?: { sign?: string; longitudeDeg?: number } | null;
    mc?: { sign?: string; longitudeDeg?: number } | null;
    dominantElement?: string;
    dominantModality?: string;
    houseSystem?: string | null;
    zodiacMode?: string;
    aspectSummary?: string[];
    aspectCount?: number;
    planetDistribution?: Record<string, number>;
    elementCounts?: Record<string, number>;
    modalityCounts?: Record<string, number>;
  } | null;
  /** Moon nakshatra shortcut; absent on legacy snapshots. */
  nakshatra?: NakshatraPlacement | null;
  planetNakshatra?: Partial<Record<string, NakshatraPlacement>> | null;
  moonProfile?: MoonProfile | null;
  dasha?: VimshottariDasha | null;
  /** Deterministic Meaning Engine output — absent on legacy snapshots. */
  meaningSnapshot?: {
    meaningEngineVersion: string;
    generatedAt: string;
    astrologyMode?: string | null;
    zodiacMode?: string | null;
    profile: {
      learningStyle: string[];
      communicationStyle: string[];
      creativeStrength: string[];
      attentionPattern: string[];
      emotionalProfile: string[];
      socialProfile: string[];
      strengths: string[];
      comfortNeeds: string[];
      motivationStyle: string[];
      curiosityPattern: string[];
    };
    parentingGuidance?: Array<{
      conceptId: string;
      guidanceId: string;
      label: string;
      confidence: number;
    }>;
    conflicts?: Array<{
      category: string;
      a: string;
      b: string;
      resolution: string;
      kept: string[];
      note: string;
    }>;
  } | null;
  /** Deterministic Development Engine output — usually assembled at AI time. */
  developmentSnapshot?: {
    developmentEngineVersion: string;
    generatedAt: string;
    ageMonths: number;
    confidence: number;
    stage: {
      id: string;
      label: string;
      ageMonthsMin: number;
      ageMonthsMax: number;
      capabilities: string[];
    };
    profile: {
      developmentStage: string;
      learningProfile: string[];
      emotionalProfile: string[];
      topPriorities: string[];
      recommendedParentActions: string[];
      avoidPatterns: string[];
    };
  } | null;
  /** Deterministic Adaptive Engine output — usually assembled at AI time. */
  adaptiveSnapshot?: {
    adaptiveEngineVersion: string;
    generatedAt: string;
    confidence: number;
    profile: {
      engagementLevel: "high" | "medium" | "low";
      preferredActivityTypes: string[];
      recommendedSessionLengthMinutes: number;
      routineHealthLabel: string;
      adaptationPriority: string;
      consistencyScore: number;
    };
  } | null;
  /** Deterministic Conversation Engine plan — usually assembled at AI time. */
  conversationPlan?: {
    conversationEngineVersion: string;
    generatedAt: string;
    intent: string;
    confidence: number;
    recommendedDepth: "brief" | "medium" | "deep";
    recommendedTone: string;
    priorityTopics: string[];
    avoidTopics: string[];
    safetyFlags: string[];
    profile: {
      intent: string;
      depth: "brief" | "medium" | "deep";
      tone: string;
      priority: string;
      avoid: string;
      order: string;
    };
  } | null;
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
    fallbackUsed?: boolean;
    houseSystem?: string | null;
    astrologyMode?: string;
    zodiacMode?: string;
    zodiac?: string;
    ayanamsa?: number | null;
    ayanamsaName?: string | null;
    nodeType?: string;
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
