// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — pure helpers
//
// All exports are deterministic (no Date / Math.random) so the API can safely
// cache responses based on inputs alone.
// ─────────────────────────────────────────────────────────────────────────────

import { buildAdaptivePromptSession, seededShuffle } from "./adaptive";
import type { PromptScoreHistory } from "./adaptive";
import {
  PARENT_GUIDANCE_CARDS,
  PRONUNCIATION_PROMPTS,
  SPEECH_AFFIRMATIONS,
  SPEECH_GAMES,
  SPEECH_MILESTONES,
} from "./content";
import type {
  AffirmationCard,
  GuidanceCard,
  PronouncePrompt,
  PronouncePromptDifficulty,
  PronouncePromptKind,
  SpeechAgeBand,
  SpeechGame,
  SpeechMilestone,
  WeeklyProgressInput,
  WeeklyProgressScore,
} from "./types";
import {
  SPEECH_COACH_MAX_MONTHS,
  SPEECH_COACH_MIN_MONTHS,
} from "./types";

/**
 * Map a child's age in months to a Speech Coach band.
 * Returns `null` only outside {@link SPEECH_COACH_MIN_MONTHS}–{@link SPEECH_COACH_MAX_MONTHS}.
 */
export function monthsToBand(months: number): SpeechAgeBand | null {
  if (!Number.isFinite(months) || months < SPEECH_COACH_MIN_MONTHS) return null;
  if (months >= SPEECH_COACH_MAX_MONTHS) return null;
  if (months < 12) return "infant";
  if (months < 24) return "1y";
  if (months < 36) return "2y";
  if (months < 48) return "3y";
  return "4y_plus";
}

/** True when the child is in the infant band (under 12 months). */
export function isInfantAgeMonths(months: number): boolean {
  return monthsToBand(months) === "infant";
}

/** Whether Speech Coach content and sessions apply to this age in months. */
export function isSpeechCoachEligibleAgeMonths(months: number): boolean {
  return monthsToBand(months) !== null;
}

/** Milestones for the band matching the given age in months. */
export function getMilestonesForAgeMonths(
  months: number,
): readonly SpeechMilestone[] {
  const band = monthsToBand(months);
  if (band === null) return [];
  return SPEECH_MILESTONES.filter((m) => m.ageBand === band);
}

/** Games available for the band matching the given age in months. */
export function getGamesForAgeMonths(months: number): readonly SpeechGame[] {
  const band = monthsToBand(months);
  if (band === null) return [];
  return SPEECH_GAMES.filter((g) => g.ageBands.includes(band));
}

/** Pronunciation prompts for an age band, optionally filtered by kind. */
export function getPromptsForAgeMonths(
  months: number,
  kind?: PronouncePromptKind,
): readonly PronouncePrompt[] {
  const band = monthsToBand(months);
  if (band === null) return [];
  return PRONUNCIATION_PROMPTS.filter(
    (p) => p.ageBands.includes(band) && (kind === undefined || p.kind === kind),
  );
}

/**
 * Return all prompts matching the given age band, kind, and difficulty.
 */
export function getPromptsPool(
  months: number,
  kind: PronouncePromptKind,
  difficulty: PronouncePromptDifficulty,
): readonly PronouncePrompt[] {
  const band = monthsToBand(months);
  const matchBand: SpeechAgeBand = band ?? "infant";

  const matches = PRONUNCIATION_PROMPTS.filter(
    (p) =>
      p.kind === kind &&
      p.ageBands.includes(matchBand) &&
      (p.difficulty ?? "easy") === difficulty,
  );
  if (matches.length > 0) return matches;

  return PRONUNCIATION_PROMPTS.filter(
    (p) => p.kind === kind && p.ageBands.includes(matchBand),
  );
}

/**
 * Build a pronunciation practice session (adaptive when history is provided).
 */
export function buildPracticeSession(
  months: number,
  kind: PronouncePromptKind,
  difficulty: PronouncePromptDifficulty,
  sessionSize: number,
  seed: number,
  history: readonly PromptScoreHistory[] = [],
): readonly PronouncePrompt[] {
  const pool = getPromptsPool(months, kind, difficulty);
  if (pool.length === 0) return [];
  const size = Math.max(1, Math.min(sessionSize, pool.length));
  if (history.length > 0) {
    return buildAdaptivePromptSession(pool, history, size, seed);
  }
  return seededShuffle([...pool], seed).slice(0, size);
}

/** All affirmation cards (band-agnostic). */
export function getAllAffirmations(): readonly AffirmationCard[] {
  return SPEECH_AFFIRMATIONS;
}

/** All parent-guidance cards (band-agnostic). */
export function getAllGuidanceCards(): readonly GuidanceCard[] {
  return PARENT_GUIDANCE_CARDS;
}

const clampPct = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
};

/**
 * Compute a deterministic weekly progress score from rolled-up inputs.
 */
export function computeWeeklyProgressScore(
  input: WeeklyProgressInput,
): WeeklyProgressScore {
  const daysActive = Math.max(0, Math.min(7, Math.floor(input.daysActive)));
  const milestonesTotal = Math.max(1, Math.floor(input.milestonesTotal));
  const milestonesOnTrack = Math.max(
    0,
    Math.min(milestonesTotal, Math.floor(input.milestonesOnTrack)),
  );
  const promptsAttempted = Math.max(0, Math.floor(input.promptsAttempted));
  const promptsClear = Math.max(0, Math.floor(input.promptsClear));

  const pronunciationPct =
    promptsAttempted === 0
      ? 0
      : clampPct((promptsClear / promptsAttempted) * 100);
  const consistencyPct = clampPct((daysActive / 7) * 100);
  const milestonePct = clampPct((milestonesOnTrack / milestonesTotal) * 100);

  const score = clampPct(
    pronunciationPct * 0.4 + consistencyPct * 0.3 + milestonePct * 0.3,
  );

  return {
    score,
    pronunciationPct,
    consistencyPct,
    milestonePct,
    streakDays: daysActive,
  };
}
