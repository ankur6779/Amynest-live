/**
 * Persist phoneme confusion pairs for adaptive practice.
 * No audio stored — grapheme labels and counts only.
 */
import type { PhonemeConfusionPair } from "./ai-reading-coach";
import { adaptiveFocusFromConfusions } from "./ai-reading-coach";

export type CoachConfusionState = {
  version: 1;
  pairs: PhonemeConfusionPair[];
  /** Rolling pronunciation accuracy 0–100 */
  pronunciationAvg: number;
  attemptCount: number;
  lastAt: number;
};

const STORAGE_PREFIX = "amynest:phonics-coach-confusions:";
const MAX_PAIRS = 40;

export function defaultCoachConfusionState(): CoachConfusionState {
  return {
    version: 1,
    pairs: [],
    pronunciationAvg: 0,
    attemptCount: 0,
    lastAt: 0,
  };
}

export function loadCoachConfusions(childId: number): CoachConfusionState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultCoachConfusionState();
    return { ...defaultCoachConfusionState(), ...JSON.parse(raw) };
  } catch {
    return defaultCoachConfusionState();
  }
}

export function saveCoachConfusions(childId: number, state: CoachConfusionState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

export function recordCoachAttempt(
  state: CoachConfusionState,
  opts: {
    pronunciationScore: number;
    confusion: PhonemeConfusionPair | null;
  },
): CoachConfusionState {
  const attemptCount = state.attemptCount + 1;
  const pronunciationAvg = Math.round(
    (state.pronunciationAvg * state.attemptCount + opts.pronunciationScore) / attemptCount,
  );

  let pairs = [...state.pairs];
  if (opts.confusion) {
    const idx = pairs.findIndex(
      (p) => p.expected === opts.confusion!.expected && p.heard === opts.confusion!.heard,
    );
    if (idx >= 0) {
      const prev = pairs[idx]!;
      pairs[idx] = { ...prev, count: prev.count + 1 };
    } else {
      pairs = [{ ...opts.confusion, count: 1 }, ...pairs].slice(0, MAX_PAIRS);
    }
    pairs.sort((a, b) => b.count - a.count);
  }

  return {
    version: 1,
    pairs,
    pronunciationAvg,
    attemptCount,
    lastAt: Date.now(),
  };
}

export function topConfusionLabels(state: CoachConfusionState, limit = 4): string[] {
  return state.pairs.slice(0, limit).map((p) => `${p.expected}→${p.heard}`);
}

export function focusGraphemesForPractice(state: CoachConfusionState, limit = 3): string[] {
  return adaptiveFocusFromConfusions(state.pairs, limit);
}
