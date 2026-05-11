// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — transcript comparison helper
//
// Pure, deterministic, zero-dependency. Safe to use in any environment.
// ─────────────────────────────────────────────────────────────────────────────

/** Normalize a spoken string for fuzzy comparison. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Word-overlap score (0–100).
 * Counts how many words from `expected` appear in `actual`.
 */
function wordOverlapScore(expected: string, actual: string): number {
  const expWords = expected.split(" ").filter(Boolean);
  if (expWords.length === 0) return 0;
  const expSet = new Set(expWords);
  const hits = actual
    .split(" ")
    .filter(Boolean)
    .filter((w) => expSet.has(w)).length;
  return Math.round((hits / expWords.length) * 100);
}

export type TranscriptFeedback = "great" | "close" | "try_again";

export interface TranscriptResult {
  /** 0–100 match confidence. */
  score: number;
  feedback: TranscriptFeedback;
  normalizedExpected: string;
  normalizedActual: string;
}

/**
 * Compare a speech-recognition transcript against the expected prompt text.
 *
 * Strategy by prompt length:
 *   - Short (≤ 3 chars, i.e. single letter / phoneme): exact match only → 0 or 100.
 *   - Word / sentence: word-overlap ratio.
 *
 * Thresholds:  score ≥ 80 → "great"  |  ≥ 50 → "close"  |  < 50 → "try_again"
 */
export function compareTranscript(
  expected: string,
  actual: string,
): TranscriptResult {
  const ne = normalize(expected);
  const na = normalize(actual);

  let score: number;
  if (ne === na) {
    score = 100;
  } else if (ne.length <= 3) {
    score = 0;
  } else {
    score = wordOverlapScore(ne, na);
  }

  const feedback: TranscriptFeedback =
    score >= 80 ? "great" : score >= 50 ? "close" : "try_again";

  return { score, feedback, normalizedExpected: ne, normalizedActual: na };
}
