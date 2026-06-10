import { isActivityUnlocked } from "./age-bands";
import type {
  ActivityLearningStats,
  AdaptivityTier,
  ParentAdaptiveInsight,
  PlaygroundActivityId,
  PlaygroundLearningState,
  PlaygroundSessionRecord,
} from "./types";

const MS_PER_DAY = 86_400_000;

const PRACTICE_ACTIVITY_IDS: PlaygroundActivityId[] = [
  "counting_adventure",
  "addition_lab",
  "subtraction_garden",
  "multiplication_factory",
  "division_bakery",
  "number_patterns",
  "math_puzzles",
];

function practicePool(ageYears: number): PlaygroundActivityId[] {
  return PRACTICE_ACTIVITY_IDS.filter((id) => isActivityUnlocked(id, ageYears));
}

export function defaultActivityStats(): ActivityLearningStats {
  return {
    attempts: 0,
    successes: 0,
    hintsTotal: 0,
    durationTotalMs: 0,
    lastPlayedAt: 0,
    lastTier: "standard",
    masteryScore: 50,
  };
}

export function defaultLearningState(): PlaygroundLearningState {
  return { sessionHistory: [], activityStats: {} };
}

export function computeMasteryScore(stats: ActivityLearningStats): number {
  if (stats.attempts === 0) return 50;
  const successRate = stats.successes / stats.attempts;
  const hintsPerAttempt = stats.hintsTotal / stats.attempts;
  const hintPenalty = Math.min(0.35, hintsPerAttempt * 0.12);
  const raw = successRate * 100 - hintPenalty * 100;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function deriveAdaptivityTier(
  activityId: PlaygroundActivityId,
  learning: PlaygroundLearningState,
): AdaptivityTier {
  const stats = learning.activityStats[activityId];
  if (!stats || stats.attempts < 2) return "standard";

  const hintsPerAttempt = stats.hintsTotal / stats.attempts;
  const successRate = stats.successes / stats.attempts;

  if (hintsPerAttempt >= 1 || successRate < 0.55 || stats.masteryScore < 42) {
    return "ease";
  }
  if (
    hintsPerAttempt <= 0.35 &&
    successRate >= 0.85 &&
    stats.masteryScore >= 78 &&
    stats.attempts >= 4
  ) {
    return "stretch";
  }
  return "standard";
}

export function recordPlaygroundSession(
  learning: PlaygroundLearningState,
  record: PlaygroundSessionRecord,
): PlaygroundLearningState {
  const prev = learning.activityStats[record.activityId] ?? defaultActivityStats();
  const nextStats: ActivityLearningStats = {
    attempts: prev.attempts + 1,
    successes: prev.successes + (record.success ? 1 : 0),
    hintsTotal: prev.hintsTotal + record.hintsUsed,
    durationTotalMs: prev.durationTotalMs + record.durationMs,
    lastPlayedAt: record.completedAt,
    lastTier: record.tierUsed,
    masteryScore: 0,
  };
  nextStats.masteryScore = computeMasteryScore(nextStats);

  return {
    sessionHistory: [record, ...learning.sessionHistory].slice(0, 40),
    activityStats: {
      ...learning.activityStats,
      [record.activityId]: nextStats,
    },
  };
}

/** Activities that need spaced-repetition practice (low mastery or stale). */
export function pickWeakActivities(
  learning: PlaygroundLearningState,
  ageYears: number,
  limit = 2,
): PlaygroundActivityId[] {
  const now = Date.now();
  const candidates: { id: PlaygroundActivityId; score: number }[] = [];

  for (const id of practicePool(ageYears)) {
    const stats = learning.activityStats[id];
    if (!stats || stats.attempts === 0) continue;

    const daysSince =
      stats.lastPlayedAt > 0 ? (now - stats.lastPlayedAt) / MS_PER_DAY : 999;
    const stale = daysSince >= 2;
    const weak = stats.masteryScore < 58;
    const hintHeavy = stats.hintsTotal / stats.attempts >= 0.8;

    if (weak || (stale && stats.masteryScore < 82) || hintHeavy) {
      // Lower sort score = higher priority
      const priority =
        stats.masteryScore + (stale ? -15 : 0) + (hintHeavy ? -10 : 0);
      candidates.push({ id, score: priority });
    }
  }

  return candidates
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((c) => c.id);
}

export function pickComebackActivity(
  learning: PlaygroundLearningState,
  ageYears: number,
): PlaygroundActivityId | null {
  return pickWeakActivities(learning, ageYears, 1)[0] ?? null;
}

/** Daily mix: one weak activity first, then variety from unlocked pool. */
export function pickDailyTaskIds(
  learning: PlaygroundLearningState,
  ageYears: number,
  count = 4,
): PlaygroundActivityId[] {
  const pool = practicePool(ageYears);
  const weak = pickWeakActivities(learning, ageYears, 1);
  const chosen: PlaygroundActivityId[] = [];

  if (weak[0]) chosen.push(weak[0]);

  for (const id of pool) {
    if (chosen.length >= count) break;
    if (!chosen.includes(id)) chosen.push(id);
  }

  return chosen.slice(0, count);
}

export function buildParentAdaptiveInsights(
  learning: PlaygroundLearningState,
  ageYears: number,
): ParentAdaptiveInsight {
  const pool = practicePool(ageYears);
  const scores: number[] = [];
  const strengthening: PlaygroundActivityId[] = [];
  const practicing: PlaygroundActivityId[] = [];

  for (const id of pool) {
    const stats = learning.activityStats[id];
    if (!stats || stats.attempts === 0) continue;
    scores.push(stats.masteryScore);
    if (stats.masteryScore >= 75) strengthening.push(id);
    else if (stats.masteryScore < 58) practicing.push(id);
  }

  const averageMastery =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  return {
    strengthening: strengthening.slice(0, 2),
    practicing: practicing.slice(0, 2),
    averageMastery,
  };
}

export function adaptivityTierLabelKey(tier: AdaptivityTier): string {
  switch (tier) {
    case "ease":
      return "tier_ease";
    case "stretch":
      return "tier_stretch";
    default:
      return "tier_standard";
  }
}
