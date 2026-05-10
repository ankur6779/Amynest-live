// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — shared types
//
// Pure types only. No React, no DOM, no Node, no DB imports. Both the web
// (`artifacts/kidschedule`) and mobile (`artifacts/amynest-mobile`) hubs and
// the API server (`artifacts/api-server`) consume these.
// ─────────────────────────────────────────────────────────────────────────────

/** Coarse speech-development bands the Speech Coach UI groups by. */
export type SpeechAgeBand = "1y" | "2y" | "3y" | "4y_plus";

/** Per-child status for a given milestone. */
export type MilestoneStatus =
  | "on_track"
  | "needs_attention"
  | "consult_expert";

/** Broad area a milestone exercises. Used for grouping in the UI. */
export type MilestoneCategory =
  | "first_words"
  | "two_word_phrase"
  | "pronunciation"
  | "social_communication"
  | "vocabulary"
  | "sentences";

/** A single age-tagged speech milestone. English text lives in the i18n manifest. */
export interface SpeechMilestone {
  id: string;
  ageBand: SpeechAgeBand;
  category: MilestoneCategory;
  /** i18n key path, e.g. `screens.speech_coach.milestones.<id>.label`. */
  i18nKeyLabel: string;
  /** i18n key path for the helper/example string shown under the label. */
  i18nKeyHint: string;
}

/** Identifier of a built-in speech game. */
export type SpeechGameId =
  | "animal_sounds"
  | "rhyming"
  | "tongue_exercises"
  | "breathing"
  | "slow_vs_fast"
  | "emotion_express";

/** A gamified speech exercise. */
export interface SpeechGame {
  id: SpeechGameId;
  ageBands: readonly SpeechAgeBand[];
  /** Star reward (1-3) shown when the child completes the activity. */
  rewardStars: 1 | 2 | 3;
  /** Achievement badge id unlocked the first time the game is completed. */
  badgeId: string;
  i18nKeyTitle: string;
  i18nKeyDescription: string;
}

/** A short, supportive affirmation card shown after activities. */
export interface AffirmationCard {
  id: string;
  i18nKeyText: string;
}

/** Educational card in the Parent Guidance area. */
export type GuidanceTopic =
  | "speech_delay_signs"
  | "screen_time_impact"
  | "talking_with_toddlers"
  | "bilingual_development"
  | "when_to_consult_expert";

export interface GuidanceCard {
  id: string;
  topic: GuidanceTopic;
  i18nKeyTitle: string;
  i18nKeyBody: string;
  /** "Amy Coach Tip" callout shown at the bottom of the card. */
  i18nKeyTip: string;
}

/** Kind of pronunciation prompt — letter / phonic / word / sentence. */
export type PronouncePromptKind = "letter" | "phonic" | "word" | "sentence";

/** A speech-practice prompt. `text` is the literal token spoken aloud and is
 *  intentionally NOT localized (English-only first round per task scope). */
export interface PronouncePrompt {
  id: string;
  kind: PronouncePromptKind;
  text: string;
  ageBands: readonly SpeechAgeBand[];
  /** i18n key for a short hint shown above the prompt (e.g. "Tap to hear"). */
  i18nKeyHint: string;
}

/** Inputs to the weekly progress scorer. */
export interface WeeklyProgressInput {
  /** Number of distinct days in the past 7 the child practiced. 0-7. */
  daysActive: number;
  /** Total prompts attempted in the week. */
  promptsAttempted: number;
  /** Subset of prompts the parent / placeholder STT marked "clear". */
  promptsClear: number;
  /** Number of milestones currently marked `on_track`. */
  milestonesOnTrack: number;
  /** Total milestones being tracked for this child / age band. Must be >= 1. */
  milestonesTotal: number;
}

/** Output of `computeWeeklyProgressScore`. All percentages are 0-100 ints. */
export interface WeeklyProgressScore {
  score: number;
  pronunciationPct: number;
  consistencyPct: number;
  milestonePct: number;
  streakDays: number;
}
