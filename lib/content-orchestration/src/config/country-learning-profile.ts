import type { CountryCode } from "../types.js";
import type { CountryLearningProfile, CountryLearningProfileConfig } from "../types-v2.js";

export const COUNTRY_LEARNING_PROFILE: CountryLearningProfileConfig = {
  IN: {
    pace: "fast",
    focus: ["phonics", "cognitive", "language"],
    explorationBias: 0.2,
    modulePriorityBoost: { phonics: 15, cognitive: 10 },
  },
  US: {
    pace: "medium",
    focus: ["motor_skills", "creativity", "social_emotional"],
    explorationBias: 0.3,
    modulePriorityBoost: { creativity: 12, social_emotional: 10 },
  },
  UK: {
    pace: "medium",
    focus: ["phonics", "language", "stories"],
    explorationBias: 0.25,
  },
  AU: {
    pace: "medium",
    focus: ["motor_skills", "stories", "creativity"],
    explorationBias: 0.28,
  },
  NZ: {
    pace: "medium",
    focus: ["creativity", "motor_skills", "stories"],
    explorationBias: 0.28,
  },
  CA: {
    pace: "medium",
    focus: ["language", "creativity", "cognitive"],
    explorationBias: 0.3,
  },
  AE: {
    pace: "medium",
    focus: ["language", "phonics", "social_emotional"],
    explorationBias: 0.22,
  },
  BD: {
    pace: "fast",
    focus: ["phonics", "cognitive", "language"],
    explorationBias: 0.18,
    modulePriorityBoost: { phonics: 12 },
  },
};

export function getCountryLearningProfile(countryCode: CountryCode): CountryLearningProfile {
  return COUNTRY_LEARNING_PROFILE[countryCode] ?? COUNTRY_LEARNING_PROFILE.US;
}
