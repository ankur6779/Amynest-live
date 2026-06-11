/**
 * True mastery engine — completion ≠ mastery.
 * Word mastered only when all dimension thresholds met.
 */

export type MasteryDimension = "heard" | "blended" | "identified" | "spoken";

export type MasteryBand = "learning" | "practicing" | "strong" | "mastered";

export type MasteryTargetType = "word" | "letter" | "phoneme" | "family";

export const MASTERY_THRESHOLDS: Record<MasteryDimension, number> = {
  heard: 3,
  blended: 3,
  identified: 3,
  spoken: 2,
};

export type DimensionCounts = Record<MasteryDimension, number>;

export type MasteryRecord = {
  id: string;
  type: MasteryTargetType;
  counts: DimensionCounts;
  score: number;
  band: MasteryBand;
  isMastered: boolean;
  firstSeenAt: number;
  lastActivityAt: number;
  /** Daily score snapshots for historical trends */
  history: { dateKey: string; score: number }[];
};

export type PhonicsMasteryState = {
  words: Record<string, MasteryRecord>;
  letters: Record<string, MasteryRecord>;
  phonemes: Record<string, MasteryRecord>;
  families: Record<string, MasteryRecord>;
  version: 3;
};

const STORAGE_PREFIX = "amynest:phonics-v3-mastery:";
const MAX_HISTORY = 90;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyCounts(): DimensionCounts {
  return { heard: 0, blended: 0, identified: 0, spoken: 0 };
}

function createRecord(id: string, type: MasteryTargetType): MasteryRecord {
  const now = Date.now();
  return {
    id,
    type,
    counts: emptyCounts(),
    score: 0,
    band: "learning",
    isMastered: false,
    firstSeenAt: now,
    lastActivityAt: now,
    history: [],
  };
}

/** 0–100 score from partial dimension progress. */
export function computeMasteryScore(counts: DimensionCounts): number {
  const weights: { dim: MasteryDimension; weight: number }[] = [
    { dim: "heard", weight: 0.25 },
    { dim: "blended", weight: 0.25 },
    { dim: "identified", weight: 0.25 },
    { dim: "spoken", weight: 0.25 },
  ];
  let total = 0;
  for (const { dim, weight } of weights) {
    const need = MASTERY_THRESHOLDS[dim];
    total += Math.min(1, counts[dim] / need) * weight * 100;
  }
  return Math.round(total);
}

export function scoreToBand(score: number): MasteryBand {
  if (score >= 90) return "mastered";
  if (score >= 70) return "strong";
  if (score >= 40) return "practicing";
  return "learning";
}

export function isTrulyMastered(counts: DimensionCounts, score: number): boolean {
  return (
    score >= 90 &&
    counts.heard >= MASTERY_THRESHOLDS.heard &&
    counts.blended >= MASTERY_THRESHOLDS.blended &&
    counts.identified >= MASTERY_THRESHOLDS.identified &&
    counts.spoken >= MASTERY_THRESHOLDS.spoken
  );
}

function bucketKey(
  type: MasteryTargetType,
): "words" | "letters" | "phonemes" | "families" {
  switch (type) {
    case "word":
      return "words";
    case "letter":
      return "letters";
    case "phoneme":
      return "phonemes";
    case "family":
      return "families";
  }
}

export function defaultMasteryState(): PhonicsMasteryState {
  return { words: {}, letters: {}, phonemes: {}, families: {}, version: 3 };
}

export function loadMasteryState(childId: number): PhonicsMasteryState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultMasteryState();
    return { ...defaultMasteryState(), ...JSON.parse(raw) };
  } catch {
    return defaultMasteryState();
  }
}

export function saveMasteryState(childId: number, state: PhonicsMasteryState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function appendHistory(record: MasteryRecord, score: number): MasteryRecord {
  const dateKey = todayKey();
  const last = record.history[record.history.length - 1];
  const history =
    last?.dateKey === dateKey
      ? [...record.history.slice(0, -1), { dateKey, score }]
      : [...record.history, { dateKey, score }].slice(-MAX_HISTORY);
  return { ...record, history };
}

export function recordMasteryEvent(
  state: PhonicsMasteryState,
  type: MasteryTargetType,
  id: string,
  dimension: MasteryDimension,
): PhonicsMasteryState {
  const key = id.trim().toLowerCase();
  const bucket = bucketKey(type);
  const map = { ...state[bucket] };
  const existing = map[key] ?? createRecord(key, type);
  const counts = {
    ...existing.counts,
    [dimension]: Math.min(
      MASTERY_THRESHOLDS[dimension],
      existing.counts[dimension] + 1,
    ),
  };
  const score = computeMasteryScore(counts);
  const band = scoreToBand(score);
  const isMastered = isTrulyMastered(counts, score);
  let updated: MasteryRecord = {
    ...existing,
    counts,
    score,
    band,
    isMastered,
    lastActivityAt: Date.now(),
  };
  updated = appendHistory(updated, score);
  map[key] = updated;
  return { ...state, [bucket]: map };
}

export function countMasteredByType(
  state: PhonicsMasteryState,
  type: MasteryTargetType,
): number {
  const bucket = state[bucketKey(type)];
  return Object.values(bucket).filter((r) => r.isMastered).length;
}

export function getWeakestWords(state: PhonicsMasteryState, limit = 10): MasteryRecord[] {
  return Object.values(state.words)
    .filter((r) => !r.isMastered)
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}
