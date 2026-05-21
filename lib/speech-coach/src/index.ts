// Public surface of @workspace/speech-coach.
// Pure data + helpers. No React, no Express, no DB imports.

export * from "./types";
export {
  SPEECH_COACH_MIN_MONTHS,
  SPEECH_COACH_MAX_MONTHS,
} from "./types";
export {
  SPEECH_MILESTONES,
  SPEECH_GAMES,
  SPEECH_AFFIRMATIONS,
  PARENT_GUIDANCE_CARDS,
  PRONUNCIATION_PROMPTS,
} from "./content";
export {
  monthsToBand,
  isInfantAgeMonths,
  isSpeechCoachEligibleAgeMonths,
  getMilestonesForAgeMonths,
  getGamesForAgeMonths,
  getPromptsForAgeMonths,
  getPromptsPool,
  buildPracticeSession,
  getAllAffirmations,
  getAllGuidanceCards,
  computeWeeklyProgressScore,
} from "./helpers";
export {
  SPEECH_COACH_I18N_MANIFEST,
  type I18nKeyManifest,
} from "./i18n-manifest";
export {
  compareTranscript,
  getTranscriptThresholds,
  type CompareTranscriptOptions,
  type TranscriptFeedback,
  type TranscriptResult,
  type TranscriptThresholds,
} from "./transcript";
export {
  buildAdaptivePromptSession,
  seededShuffle,
  type PromptScoreHistory,
} from "./adaptive";
export {
  SPEECH_GAME_SESSIONS,
  buildGamePromptSession,
  getGamePromptPool,
  type SpeechGameSessionConfig,
} from "./games";
export { getArticulationCue, type ArticulationCue } from "./articulation";
export {
  aggregateDailyTrend,
  aggregateWeakSounds,
  historyFromAttempts,
  type DailyTrendEntry,
  type PracticeAttemptRow,
  type WeakSoundEntry,
} from "./weak-sounds";
export {
  getPromptSpeakText,
  LETTER_PRONUNCIATION_PROMPTS,
  LETTERS_DATA,
} from "./pronunciation-datasets";

