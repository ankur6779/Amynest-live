import { isActivityUnlocked } from "./age-bands";
import { defaultActivityStats, pickWeakActivities } from "./adaptive";
import type {
  ParentRetentionSnapshot,
  PlaygroundActivityId,
  PlaygroundLearningState,
  PlaygroundRewardState,
  SkillBreakdown,
  SkillTrend,
} from "./types";

export const SKILL_ACTIVITIES: Record<keyof SkillBreakdown, PlaygroundActivityId[]> = {
  counting: ["counting_adventure"],
  addition: ["addition_lab"],
  subtraction: ["subtraction_garden"],
  multiplication: ["multiplication_factory"],
  division: ["division_bakery"],
  patterns: ["number_patterns", "math_puzzles"],
};

function skillMastery(
  learning: PlaygroundLearningState,
  activityIds: PlaygroundActivityId[],
): number {
  const scores: number[] = [];
  for (const id of activityIds) {
    const stats = learning.activityStats[id];
    if (stats && stats.attempts > 0) scores.push(stats.masteryScore);
  }
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function computeSkillBreakdown(learning: PlaygroundLearningState): SkillBreakdown {
  return {
    counting: skillMastery(learning, SKILL_ACTIVITIES.counting),
    addition: skillMastery(learning, SKILL_ACTIVITIES.addition),
    subtraction: skillMastery(learning, SKILL_ACTIVITIES.subtraction),
    multiplication: skillMastery(learning, SKILL_ACTIVITIES.multiplication),
    division: skillMastery(learning, SKILL_ACTIVITIES.division),
    patterns: skillMastery(learning, SKILL_ACTIVITIES.patterns),
  };
}

function sessionsForSkill(
  learning: PlaygroundLearningState,
  skill: keyof SkillBreakdown,
) {
  const ids = new Set(SKILL_ACTIVITIES[skill]);
  return learning.sessionHistory.filter((r) => ids.has(r.activityId));
}

export function deriveSkillTrend(
  learning: PlaygroundLearningState,
  skill: keyof SkillBreakdown,
): SkillTrend {
  const sessions = sessionsForSkill(learning, skill);
  if (sessions.length < 4) return "stable";

  const recent = sessions.slice(0, 5);
  const prior = sessions.slice(5, 10);
  if (prior.length === 0) return "stable";

  const rate = (list: typeof sessions) => {
    const ok = list.filter((s) => s.success).length;
    return ok / list.length;
  };

  const delta = rate(recent) - rate(prior);
  if (delta >= 0.15) return "improving";
  if (delta <= -0.15) return "needs_practice";
  return "stable";
}

export function mathConfidenceStars(breakdown: SkillBreakdown): 1 | 2 | 3 | 4 | 5 {
  const values = Object.values(breakdown).filter((v) => v > 0);
  if (values.length === 0) return 3;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  if (avg >= 90) return 5;
  if (avg >= 78) return 4;
  if (avg >= 62) return 3;
  if (avg >= 45) return 2;
  return 1;
}

const SKILL_TO_ACTIVITY: Record<keyof SkillBreakdown, PlaygroundActivityId> = {
  counting: "counting_adventure",
  addition: "addition_lab",
  subtraction: "subtraction_garden",
  multiplication: "multiplication_factory",
  division: "division_bakery",
  patterns: "number_patterns",
};

function pickRecommendedActivity(
  learning: PlaygroundLearningState,
  breakdown: SkillBreakdown,
  ageYears: number,
): { activityId: PlaygroundActivityId; trend: SkillTrend } {
  const weak = pickWeakActivities(learning, ageYears, 1)[0];
  if (weak) {
    const skill = (Object.keys(SKILL_ACTIVITIES) as (keyof SkillBreakdown)[]).find((key) =>
      SKILL_ACTIVITIES[key].includes(weak),
    );
    return {
      activityId: weak,
      trend: skill ? deriveSkillTrend(learning, skill) : "needs_practice",
    };
  }

  let lowestSkill: keyof SkillBreakdown = "counting";
  let lowestScore = 101;
  for (const key of Object.keys(breakdown) as (keyof SkillBreakdown)[]) {
    const score = breakdown[key];
    const activity = SKILL_TO_ACTIVITY[key];
    if (score > 0 && score < lowestScore && isActivityUnlocked(activity, ageYears)) {
      lowestScore = score;
      lowestSkill = key;
    }
  }

  if (lowestScore <= 100) {
    return {
      activityId: SKILL_TO_ACTIVITY[lowestSkill],
      trend: deriveSkillTrend(learning, lowestSkill),
    };
  }

  return { activityId: "counting_adventure", trend: "stable" };
}

export function buildParentRetentionSnapshot(
  learning: PlaygroundLearningState,
  rewards: PlaygroundRewardState,
  ageYears: number,
): ParentRetentionSnapshot {
  const skillBreakdown = computeSkillBreakdown(learning);
  const { activityId, trend } = pickRecommendedActivity(learning, skillBreakdown, ageYears);

  return {
    mathConfidenceStars: mathConfidenceStars(skillBreakdown),
    skillBreakdown,
    recommendedActivityId: activityId,
    recommendedTrend: trend,
    sessionCount: learning.sessionHistory.length,
    generatedAt: Date.now(),
  };
}

/** Default engagement slice for v2 → v3 migration. */
export function defaultEngagementState(): import("./types").PlaygroundEngagementState {
  const now = Date.now();
  return {
    consecutiveSuccesses: 0,
    consecutiveFailures: 0,
    lastInteractionAt: now,
    sessionStartedAt: now,
  };
}

/** Ensures activity stats exist for snapshot calculations. */
export function ensureActivityStats(
  learning: PlaygroundLearningState,
): PlaygroundLearningState {
  const activityStats = { ...learning.activityStats };
  for (const ids of Object.values(SKILL_ACTIVITIES)) {
    for (const id of ids) {
      if (!activityStats[id]) activityStats[id] = defaultActivityStats();
    }
  }
  return { ...learning, activityStats };
}
