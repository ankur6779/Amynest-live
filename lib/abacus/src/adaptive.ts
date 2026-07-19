/**
 * Hidden adaptive intelligence for Abacus PRO Zone V3.
 * Pure — no React. Adjusts difficulty from observed session signals.
 */

export type LearnerSignal =
  | "fast_learner"
  | "needs_help"
  | "repeated_mistakes"
  | "long_hesitation"
  | "random_guessing"
  | "steady";

export type AdaptiveProfile = {
  signal: LearnerSignal;
  /** Multiplier on operand ranges — <1 easier, >1 harder. */
  easeFactor: number;
  /** Scale challenge/mental timers — <1 tighter, >1 more time. */
  timerScale: number;
  /** How often to auto-surface hints (0–1). */
  hintFrequency: number;
  /** Suggest a short review of the previous skill. */
  suggestReview: boolean;
  coachNote: string;
};

export type AttemptObservation = {
  correct: boolean;
  /** Thinking time before submit. */
  elapsedMs: number;
  /** Same prompt/concept failed previously in this session. */
  repeatedMistake?: boolean;
  /** Answer wildly off (e.g. > 3× correct magnitude). */
  wildGuess?: boolean;
};

export type AdaptiveSessionStats = {
  attempts: number;
  correct: number;
  avgElapsedMs: number;
  repeatMistakes: number;
  wildGuesses: number;
  longHesitations: number;
  fastAnswers: number;
};

export function emptyAdaptiveStats(): AdaptiveSessionStats {
  return {
    attempts: 0,
    correct: 0,
    avgElapsedMs: 0,
    repeatMistakes: 0,
    wildGuesses: 0,
    longHesitations: 0,
    fastAnswers: 0,
  };
}

const LONG_HESITATION_MS = 12_000;
const FAST_ANSWER_MS = 2_500;

export function foldAttempt(
  stats: AdaptiveSessionStats,
  obs: AttemptObservation,
): AdaptiveSessionStats {
  const attempts = stats.attempts + 1;
  const correct = stats.correct + (obs.correct ? 1 : 0);
  const avgElapsedMs = Math.round(
    (stats.avgElapsedMs * stats.attempts + obs.elapsedMs) / attempts,
  );
  return {
    attempts,
    correct,
    avgElapsedMs,
    repeatMistakes: stats.repeatMistakes + (obs.repeatedMistake ? 1 : 0),
    wildGuesses: stats.wildGuesses + (obs.wildGuess ? 1 : 0),
    longHesitations:
      stats.longHesitations + (obs.elapsedMs >= LONG_HESITATION_MS ? 1 : 0),
    fastAnswers: stats.fastAnswers + (obs.correct && obs.elapsedMs <= FAST_ANSWER_MS ? 1 : 0),
  };
}

export function isWildGuess(answer: number, correct: number): boolean {
  if (!Number.isFinite(answer) || !Number.isFinite(correct)) return false;
  if (answer === correct) return false;
  const mag = Math.max(1, Math.abs(correct));
  return Math.abs(answer - correct) >= mag * 3 || answer < 0;
}

/** Derive a soft adaptive profile after a few attempts. */
export function deriveAdaptiveProfile(stats: AdaptiveSessionStats): AdaptiveProfile {
  if (stats.attempts < 2) {
    return {
      signal: "steady",
      easeFactor: 1,
      timerScale: 1,
      hintFrequency: 0.15,
      suggestReview: false,
      coachNote: "Let's get warmed up!",
    };
  }

  const accuracy = stats.correct / stats.attempts;
  const repeatRate = stats.repeatMistakes / stats.attempts;
  const wildRate = stats.wildGuesses / stats.attempts;
  const hesitateRate = stats.longHesitations / stats.attempts;
  const fastRate = stats.fastAnswers / Math.max(1, stats.correct);

  if (wildRate >= 0.4) {
    return {
      signal: "random_guessing",
      easeFactor: 0.7,
      timerScale: 1.35,
      hintFrequency: 0.7,
      suggestReview: true,
      coachNote: "Slow down — picture the beads before you answer.",
    };
  }

  if (repeatRate >= 0.35 || accuracy < 0.4) {
    return {
      signal: "repeated_mistakes",
      easeFactor: 0.75,
      timerScale: 1.25,
      hintFrequency: 0.65,
      suggestReview: true,
      coachNote: "I saw the same kind of mistake — let's fix that together.",
    };
  }

  if (hesitateRate >= 0.4 && accuracy < 0.7) {
    return {
      signal: "long_hesitation",
      easeFactor: 0.85,
      timerScale: 1.4,
      hintFrequency: 0.55,
      suggestReview: false,
      coachNote: "Let's slow down. One bead at a time.",
    };
  }

  if (accuracy < 0.55) {
    return {
      signal: "needs_help",
      easeFactor: 0.8,
      timerScale: 1.3,
      hintFrequency: 0.5,
      suggestReview: true,
      coachNote: "You're learning — try using the beads, then go mental.",
    };
  }

  if (accuracy >= 0.85 && fastRate >= 0.5) {
    return {
      signal: "fast_learner",
      easeFactor: 1.2,
      timerScale: 0.85,
      hintFrequency: 0.05,
      suggestReview: false,
      coachNote: "That was super fast! Ready for a tougher one?",
    };
  }

  return {
    signal: "steady",
    easeFactor: 1,
    timerScale: 1,
    hintFrequency: 0.2,
    suggestReview: false,
    coachNote: "Great rhythm — keep going!",
  };
}

/** Shrink/expand an inclusive [min,max] operand range by easeFactor. */
export function scaleOperandRange(
  range: readonly [number, number],
  easeFactor: number,
): [number, number] {
  const [lo, hi] = range;
  if (hi <= lo) return [lo, hi];
  const span = hi - lo;
  const factor = Math.min(1.5, Math.max(0.5, easeFactor));
  if (factor >= 1) {
    const grow = Math.round(span * (factor - 1) * 0.5);
    return [lo, hi + grow];
  }
  const shrink = Math.round(span * (1 - factor));
  const newHi = Math.max(lo, hi - shrink);
  return [lo, newHi];
}
