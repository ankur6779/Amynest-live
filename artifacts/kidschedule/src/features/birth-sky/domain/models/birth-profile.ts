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

export type AstronomyBody = {
  id: "sun" | "moon";
  eclipticLongitudeDeg: number;
  sign: string;
};

export type AstronomyData = {
  bodies: AstronomyBody[];
  sunSign: string;
  moonSign: string;
  moonPhase: string;
  moonPhaseLabel: string;
  risingSign: string | null;
  houses: null;
  precision: {
    timePrecision: TimePrecision;
    placeProvided: boolean;
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
