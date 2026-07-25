/** Reflective consent policy version (Pack 2 §6.3). */
export const BIRTH_SKY_CONSENT_VERSION = "birth_sky_consent_v1" as const;

export const BIRTH_SKY_CONSENT_SCOPES = [
  "astronomy_compute",
  "traditional_optional",
  "amy_insights_optional",
] as const;

export type BirthSkyConsentScope = (typeof BIRTH_SKY_CONSENT_SCOPES)[number];
