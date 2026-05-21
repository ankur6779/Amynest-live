// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — transcript comparison helper
//
// Pure, deterministic, zero-dependency. Safe to use in any environment.
// ─────────────────────────────────────────────────────────────────────────────

import type { PronouncePromptKind } from "./types";

/** Normalize a spoken string for fuzzy comparison. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classic Levenshtein distance (iterative, bounded inputs). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) row[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = row[0]!;
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n]!;
}

/** 0–100 similarity from edit distance. */
function editSimilarity(a: string, b: string): number {
  if (!a && !b) return 0;
  if (a === b) return 100;
  const maxLen = Math.max(a.length, b.length, 1);
  return Math.round((1 - levenshtein(a, b) / maxLen) * 100);
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

/** Common child mis-hearings for single letters (English). */
const LETTER_ALIASES: Readonly<Record<string, readonly string[]>> = {
  a: ["a", "ay", "ah", "eh"],
  b: ["b", "bee", "be"],
  c: ["c", "see", "cee"],
  d: ["d", "dee"],
  e: ["e", "ee", "eh"],
  f: ["f", "eff"],
  g: ["g", "jee", "gee"],
  h: ["h", "aitch", "h"],
  i: ["i", "eye", "aye"],
  j: ["j", "jay"],
  k: ["k", "kay"],
  l: ["l", "ell", "el"],
  m: ["m", "em"],
  n: ["n", "en"],
  o: ["o", "oh", "owe"],
  p: ["p", "pee"],
  q: ["q", "cue", "queue"],
  r: ["r", "are", "ar"],
  s: ["s", "ess"],
  t: ["t", "tee"],
  u: ["u", "you", "yoo"],
  v: ["v", "vee"],
  w: ["w", "doubleyou", "doubleu"],
  x: ["x", "ex"],
  y: ["y", "why", "wye"],
  z: ["z", "zed", "zee"],
};

function scoreLetter(expected: string, actual: string): number {
  const letter = expected.trim().toLowerCase().slice(0, 1);
  if (!letter) return 0;
  const aliases = LETTER_ALIASES[letter] ?? [letter];
  const tokens = actual.split(/\s+/).filter(Boolean);
  for (const token of tokens) {
    const t = token.toLowerCase();
    if (aliases.includes(t)) return 100;
    if (editSimilarity(letter, t) >= 75) return 92;
  }
  if (actual.includes(letter)) return 85;
  return editSimilarity(letter, actual);
}

function scorePhonic(expected: string, actual: string): number {
  const ne = normalize(expected);
  const na = normalize(actual);
  if (!na) return 0;
  if (ne === na) return 100;
  const edit = editSimilarity(ne, na);
  const overlap = wordOverlapScore(ne, na);
  return Math.max(edit, overlap);
}

function scoreWordOrSentence(expected: string, actual: string): number {
  const ne = normalize(expected);
  const na = normalize(actual);
  if (!na) return 0;
  if (ne === na) return 100;
  const overlap = wordOverlapScore(ne, na);
  const edit = editSimilarity(ne, na);
  // Partial credit when the child says the target as a substring.
  const contains =
    na.includes(ne) || ne.includes(na) ? Math.min(95, overlap + 15) : 0;
  return Math.max(overlap, edit, contains);
}

export type TranscriptFeedback = "great" | "close" | "try_again";

export interface TranscriptThresholds {
  great: number;
  close: number;
}

export interface CompareTranscriptOptions {
  kind?: PronouncePromptKind;
  /** Child age in months — toddlers get slightly lower pass thresholds. */
  ageMonths?: number;
}

export interface TranscriptResult {
  /** 0–100 match confidence. */
  score: number;
  feedback: TranscriptFeedback;
  normalizedExpected: string;
  normalizedActual: string;
}

/** Feedback thresholds; toddlers (under 36 months) get gentler cutoffs. */
export function getTranscriptThresholds(
  ageMonths?: number,
): TranscriptThresholds {
  const toddler =
    typeof ageMonths === "number" &&
    Number.isFinite(ageMonths) &&
    ageMonths >= 12 &&
    ageMonths < 36;
  return toddler ? { great: 70, close: 45 } : { great: 80, close: 50 };
}

function feedbackFromScore(
  score: number,
  thresholds: TranscriptThresholds,
): TranscriptFeedback {
  if (score >= thresholds.great) return "great";
  if (score >= thresholds.close) return "close";
  return "try_again";
}

/**
 * Compare a speech-recognition transcript against the expected prompt text.
 *
 * Uses kind-aware scoring (letter aliases, phonics edit distance, word overlap).
 * Optional `ageMonths` lowers pass thresholds for toddlers.
 */
export function compareTranscript(
  expected: string,
  actual: string,
  options?: CompareTranscriptOptions,
): TranscriptResult {
  const ne = normalize(expected);
  const na = normalize(actual);
  const kind = options?.kind;
  const thresholds = getTranscriptThresholds(options?.ageMonths);

  let score: number;
  if (!na) {
    score = 0;
  } else if (ne === na) {
    score = 100;
  } else if (kind === "letter" || (kind === undefined && ne.length <= 2)) {
    score = scoreLetter(expected, na);
  } else if (kind === "phonic") {
    score = scorePhonic(expected, na);
  } else {
    score = scoreWordOrSentence(expected, na);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const feedback = feedbackFromScore(score, thresholds);

  return { score, feedback, normalizedExpected: ne, normalizedActual: na };
}
