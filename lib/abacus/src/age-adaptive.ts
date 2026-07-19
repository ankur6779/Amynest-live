import type { LevelId } from "./index.js";

/** Highest level Amy recommends for this age (soft guidance, not a paywall). */
export function recommendedLevelForAge(ageYears: number): LevelId {
  const age = Math.max(0, Math.floor(ageYears));
  // Toddlers 2–3: gently stay on Level 1 even though eligible for the zone.
  if (age <= 3) return 1;
  if (age <= 4) return 1;
  if (age <= 5) return 2;
  if (age <= 6) return 3;
  if (age <= 7) return 4;
  if (age <= 8) return 5;
  if (age <= 9) return 6;
  return 7;
}

export function isLevelAgeRecommended(level: LevelId, ageYears: number): boolean {
  return level <= recommendedLevelForAge(ageYears);
}

export function ageSoftLockMessage(level: LevelId, minAgeYears: number): string {
  return `This level is best after age ${minAgeYears}.`;
}

export type AgeLevelAccess = {
  recommended: boolean;
  softLocked: boolean;
  minAge: number;
  message: string;
};

/**
 * Soft age gate: progression unlocks still apply; age only soft-locks
 * levels above the recommended band unless the parent overrides.
 */
export function resolveAgeLevelAccess(input: {
  level: LevelId;
  ageYears: number;
  minAgeForLevel: number;
  progressionUnlocked: boolean;
  parentOverride: boolean;
}): AgeLevelAccess {
  const recommended = isLevelAgeRecommended(input.level, input.ageYears);
  const softLocked =
    input.progressionUnlocked && !recommended && !input.parentOverride;
  return {
    recommended,
    softLocked,
    minAge: input.minAgeForLevel,
    message: ageSoftLockMessage(input.level, input.minAgeForLevel),
  };
}
