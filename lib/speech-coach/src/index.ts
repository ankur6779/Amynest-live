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
  achievementLabel,
  buildCoachLearningJourney,
  classifySoundCategory,
  mergeCoachJourneySnapshot,
  type CoachLearningJourney,
  type CoachLocalSnapshot,
  type JourneyAchievementId,
  type SessionAttemptInput,
  type SessionJourneyInput,
} from "./coach-journey";
export {
  buildActivityIntro,
  buildFeedbackLines,
  buildItemInvite,
  buildItemPromptLines,
  buildListeningEncouragement,
  buildJourneyWelcomeLines,
  buildEffortMemoryLine,
  buildMemoryWelcomeLines,
  buildMidSessionMemoryLine,
  buildParentTrustObservation,
  buildPersonalAchievementLine,
  buildProgressNote,
  buildSessionClosing,
  buildSessionGreeting,
  buildStreakCelebration,
  coachActivityIntroHint,
  countMemoryReferences,
  createCoachDialogueContext,
  evaluateCoachResponse,
  pickCoachDisplayFeedback,
  type CoachActivityKind,
  type CoachDialogueContext,
  type CoachEvaluationResult,
} from "./coach-dialogue";
export {
  buildCoachSessionMemory,
  countConsecutivePracticeDays,
  deriveCoachMemoryTone,
  formatSoundForSpeech,
  canUseMidSessionMemoryReference,
  daysSinceLastSession,
  type CoachMemoryTone,
  type CoachProgressInput,
  type CoachSessionMemory,
} from "./coach-memory";
export {
  filterCatalogByDifficulty,
  getPracticeCatalog,
  getPromptSpeakText,
  LETTER_PRONUNCIATION_PROMPTS,
  PHONIC_PRONUNCIATION_PROMPTS,
  WORD_PRONUNCIATION_PROMPTS,
  SENTENCE_PRONUNCIATION_PROMPTS,
  WORDS_DATA,
  SENTENCES_DATA,
  LETTERS_DATA,
} from "./pronunciation-datasets";


