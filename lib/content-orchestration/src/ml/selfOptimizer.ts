import type { MlMetrics } from "./types.js";
import type {
  OptimizationGoal,
  SystemPerformanceSnapshot,
  TuningAdjustments,
  TuningParameters,
} from "./types-meta.js";
import { applyPolicyToTuning } from "./policyEngine.js";

export const DEFAULT_OPTIMIZATION_GOALS: OptimizationGoal[] = [
  { id: "engagement", metric: "engagement", target: 0.65, weight: 0.4, priority: 1 },
  { id: "retention", metric: "retention", target: 0.5, weight: 0.35, priority: 2 },
  { id: "reward", metric: "reward", target: 0.35, weight: 0.25, priority: 3 },
];

export function snapshotSystemPerformance(metrics: MlMetrics): SystemPerformanceSnapshot {
  return {
    engagementScore: Math.max(0, 0.5 + metrics.engagementLift * 0.5),
    retentionRate: metrics.sessionReturnRate || metrics.nextDayRetention,
    avgReward: metrics.avgReward,
    modelAccuracy: metrics.predictionAccuracy,
    sampleCount: metrics.sampleCount,
    updatedAt: new Date().toISOString(),
  };
}

export function scoreAgainstGoals(
  perf: SystemPerformanceSnapshot,
  goals: OptimizationGoal[],
): number {
  let score = 0;
  let weightSum = 0;
  for (const g of goals) {
    const w = g.weight;
    weightSum += w;
    let actual = 0;
    if (g.metric === "engagement") actual = perf.engagementScore;
    if (g.metric === "retention") actual = perf.retentionRate;
    if (g.metric === "reward") actual = Math.max(0, perf.avgReward + 0.5);
    if (g.metric === "accuracy") actual = perf.modelAccuracy;
    score += w * Math.min(1, actual / Math.max(0.01, g.target));
  }
  return weightSum > 0 ? score / weightSum : 0.5;
}

export function detectUnderperformingAreas(
  perf: SystemPerformanceSnapshot,
  goals: OptimizationGoal[] = DEFAULT_OPTIMIZATION_GOALS,
): string[] {
  const areas: string[] = [];
  for (const g of goals) {
    let actual = 0;
    if (g.metric === "engagement") actual = perf.engagementScore;
    if (g.metric === "retention") actual = perf.retentionRate;
    if (g.metric === "reward") actual = perf.avgReward;
    if (g.metric === "accuracy") actual = perf.modelAccuracy;
    if (actual < g.target * 0.85) areas.push(g.metric);
  }
  return areas;
}

export function proposeTuningAdjustments(
  perf: SystemPerformanceSnapshot,
  underperforming: string[],
): TuningAdjustments {
  if (underperforming.includes("engagement")) {
    return {
      explorationRateDelta: 0.03,
      rewardFrequencyShift: "higher",
      reason: "low_engagement_boost_exploration_and_rewards",
    };
  }
  if (underperforming.includes("retention")) {
    return {
      explorationRateDelta: -0.02,
      difficultyRampShift: "slower",
      reason: "low_retention_stabilize_difficulty",
    };
  }
  if (underperforming.includes("reward")) {
    return {
      rewardFrequencyShift: "higher",
      explorationRateDelta: 0.01,
      reason: "low_reward_signal_increase_positive_feedback",
    };
  }
  if (perf.engagementScore > 0.75 && perf.retentionRate > 0.55) {
    return {
      explorationRateDelta: 0.02,
      difficultyRampShift: "faster",
      reason: "strong_performance_gentle_challenge_increase",
    };
  }
  return {
    explorationRateDelta: 0,
    difficultyRampShift: "hold",
    rewardFrequencyShift: "hold",
    reason: "stable_no_change",
  };
}

export function optimizeTuningParameters(
  current: TuningParameters,
  metrics: MlMetrics,
  goals: OptimizationGoal[] = DEFAULT_OPTIMIZATION_GOALS,
): { tuning: TuningParameters; adjustments: TuningAdjustments; goalScore: number } {
  const perf = snapshotSystemPerformance(metrics);
  const under = detectUnderperformingAreas(perf, goals);
  const adjustments = proposeTuningAdjustments(perf, under);
  const tuning = applyPolicyToTuning(current, adjustments);
  const goalScore = scoreAgainstGoals(perf, goals);
  return { tuning, adjustments, goalScore };
}
