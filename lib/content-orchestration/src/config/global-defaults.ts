import type { AntiRepetitionConfig, GlobalAgeDefaults } from "../types.js";

export const GLOBAL_AGE_DEFAULTS: GlobalAgeDefaults = {
  phonicsStart: 28,
  motorSkillsStart: 6,
  socialStart: 18,
  ageBands: [
    { minMonths: 0, maxMonths: 24, band: "0_24", stage: "infant" },
    { minMonths: 24, maxMonths: 36, band: "24_36", stage: "toddler" },
    { minMonths: 36, maxMonths: 48, band: "36_48", stage: "preschooler" },
    { minMonths: 48, maxMonths: 72, band: "48_72", stage: "preschooler" },
  ],
};

export const DEFAULT_ANTI_REPETITION: AntiRepetitionConfig = {
  recentWindowDaysMin: 3,
  recentWindowDaysMax: 7,
  maxSeenCountBeforeExclude: 3,
  newContentRatio: 0.65,
  familiarContentRatio: 0.35,
};

/** Daily plan cache TTL — one calendar day plus buffer. */
export const DAILY_PLAN_CACHE_TTL_SECONDS = 86_400;
