import type { InterventionScorecard, MetricDelta, OutcomeMetrics } from "./types.js";

/** Minimum absolute delta to count as meaningful (percentage points). */
const ROUTINE_DELTA_THRESHOLD = 5;
const LEARNING_DELTA_THRESHOLD = 5;

export function computeMetricDelta(
  baseline: OutcomeMetrics,
  followUp: OutcomeMetrics,
): MetricDelta {
  return {
    routineCompletionRate7d: followUp.routineCompletionRate7d - baseline.routineCompletionRate7d,
    learningSuccess7d: followUp.learningSuccess7d - baseline.learningSuccess7d,
    streakDays: followUp.streakDays - baseline.streakDays,
    sessionsLast7d: followUp.sessionsLast7d - baseline.sessionsLast7d,
    healthScore: followUp.healthScore - baseline.healthScore,
    childEngagement: followUp.childEngagement - baseline.childEngagement,
  };
}

export function scoreInterventionImpact(
  baseline: OutcomeMetrics,
  followUp: OutcomeMetrics,
  interventionType: string,
): { scorecard: InterventionScorecard; confidence: number; summary: string } {
  const delta = computeMetricDelta(baseline, followUp);

  const primaryDelta =
    interventionType.includes("reading") || interventionType.includes("learning") || interventionType.includes("phonics")
      ? delta.learningSuccess7d
      : interventionType.includes("routine")
        ? delta.routineCompletionRate7d
        : Math.max(delta.routineCompletionRate7d, delta.learningSuccess7d, delta.healthScore);

  const secondaryPositive =
    (delta.routineCompletionRate7d > 0 ? 1 : 0) +
    (delta.learningSuccess7d > 0 ? 1 : 0) +
    (delta.healthScore > 0 ? 1 : 0) +
    (delta.streakDays > 0 ? 1 : 0);

  let scorecard: InterventionScorecard;
  if (primaryDelta >= ROUTINE_DELTA_THRESHOLD || primaryDelta >= LEARNING_DELTA_THRESHOLD) {
    scorecard = "success";
  } else if (primaryDelta > 0 || secondaryPositive >= 2) {
    scorecard = "partial_success";
  } else if (primaryDelta < -ROUTINE_DELTA_THRESHOLD || primaryDelta < -LEARNING_DELTA_THRESHOLD) {
    scorecard = "negative_impact";
  } else {
    scorecard = "no_impact";
  }

  const confidence = Math.min(
    0.95,
    0.4 + Math.abs(primaryDelta) / 50 + secondaryPositive * 0.1,
  );

  const summary = buildDeltaSummary(delta, scorecard);
  return { scorecard, confidence: Math.round(confidence * 100) / 100, summary };
}

function buildDeltaSummary(delta: MetricDelta, scorecard: InterventionScorecard): string {
  const parts: string[] = [];
  if (delta.routineCompletionRate7d !== 0) {
    parts.push(`routine ${delta.routineCompletionRate7d >= 0 ? "+" : ""}${Math.round(delta.routineCompletionRate7d)}%`);
  }
  if (delta.learningSuccess7d !== 0) {
    parts.push(`learning ${delta.learningSuccess7d >= 0 ? "+" : ""}${Math.round(delta.learningSuccess7d)}%`);
  }
  if (delta.healthScore !== 0) {
    parts.push(`health ${delta.healthScore >= 0 ? "+" : ""}${Math.round(delta.healthScore)} pts`);
  }
  if (parts.length === 0) return scorecard === "no_impact" ? "No measurable change" : scorecard;
  return parts.join(", ");
}

export function emptyOutcomeMetrics(): OutcomeMetrics {
  return {
    routineCompletionRate7d: 0,
    learningSuccess7d: 0,
    streakDays: 0,
    sessionsLast7d: 0,
    healthScore: 0,
    childEngagement: 0,
  };
}

export function outcomeMetricsFromSignals(signals: {
  routineCompletionRate7d?: number;
  lessonsCompleted7d?: number;
  currentStreakDays?: number;
  sessionsLast7d?: number;
  healthScore?: number;
}): OutcomeMetrics {
  return {
    routineCompletionRate7d: Math.round((signals.routineCompletionRate7d ?? 0) * 100),
    learningSuccess7d: Math.min(100, (signals.lessonsCompleted7d ?? 0) * 15),
    streakDays: signals.currentStreakDays ?? 0,
    sessionsLast7d: signals.sessionsLast7d ?? 0,
    healthScore: signals.healthScore ?? 0,
    childEngagement: Math.min(100, (signals.sessionsLast7d ?? 0) * 12),
  };
}
