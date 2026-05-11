// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — pure helpers
//
// All exports are deterministic (no Date / Math.random) so the API can safely
// cache responses based on inputs alone.
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * Map a child's age in months to a Speech Coach band.
 * Returns `null` for children outside the 1–8 year (12–96 month) range.
 *
 * Boundaries (inclusive low, exclusive high):
 *   12-23 → "1y"
 *   24-35 → "2y"
 *   36-47 → "3y"
 *   48-96 → "4y_plus"
 */
export function monthsToBand(months: number): SpeechAgeBand | null {
  if (!Number.isFinite(months) || months < 12 || months >= 97) return null;
  if (months < 24) return "1y";
  if (months < 36) return "2y";
  if (months < 48) return "3y";
  return "4y_plus";
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
 * Falls back to "easy" prompts (difficulty undefined or "easy") when the
 * strict difficulty slice is empty, so a session is never blank.
 *
 * Deterministic ordering — callers should shuffle in the UI layer using
 * their own entropy source so this helper stays cache-safe.
 */
export function getPromptsPool(
  months: number,
  kind: PronouncePromptKind,
  difficulty: PronouncePromptDifficulty,
): readonly PronouncePrompt[] {
  const band = monthsToBand(months);
  const matchBand = band !== null ? band : "1y";

  const matches = PRONUNCIATION_PROMPTS.filter(
    (p) =>
      p.kind === kind &&
      p.ageBands.includes(matchBand) &&
      (p.difficulty ?? "easy") === difficulty,
  );
  if (matches.length > 0) return matches;

  // Fallback: any prompt for this kind + band regardless of difficulty
  return PRONUNCIATION_PROMPTS.filter(
    (p) => p.kind === kind && p.ageBands.includes(matchBand),
  );
}

/** All affirmation cards (band-agnostic). Exposed as a helper for symmetry. */
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
 *
 * Component weights:
 *   pronunciation 40% · consistency 30% · milestone 30%
 *
 * Defensive: zero-division guarded; over-counted clear prompts clamped to 100%.
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
