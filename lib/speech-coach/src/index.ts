// Public surface of @workspace/speech-coach.
// Pure data + helpers. No React, no Express, no DB imports.

export * from "./types.js";
export {
  SPEECH_MILESTONES,
  SPEECH_GAMES,
  SPEECH_AFFIRMATIONS,
  PARENT_GUIDANCE_CARDS,
  PRONUNCIATION_PROMPTS,
} from "./content.js";
export {
  monthsToBand,
  getMilestonesForAgeMonths,
  getGamesForAgeMonths,
  getPromptsForAgeMonths,
  getAllAffirmations,
  getAllGuidanceCards,
  computeWeeklyProgressScore,
} from "./helpers.js";
export {
  SPEECH_COACH_I18N_MANIFEST,
  type I18nKeyManifest,
} from "./i18n-manifest.js";
