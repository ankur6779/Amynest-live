import type { FamilyHealthScore, FamilyIntelligenceInput, HealthScoreComponents } from "./types.js";

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computeHealthScore(input: FamilyIntelligenceInput): FamilyHealthScore {
  const routineConsistency = clamp(input.routineCompletionRate7d * 100);
  const learningConsistency = clamp(
    input.lessonsCompleted7d >= 5 ? 90 :
    input.lessonsCompleted7d >= 3 ? 75 :
    input.lessonsCompleted7d >= 1 ? 55 : 25,
  );
  const sleepConsistency = clamp(
    input.sleepQualityAvg7d != null ? input.sleepQualityAvg7d * 20 : 60,
  );
  const parentEngagement = clamp(
    input.notificationsOpened7d * 12 +
    input.sessionsLast7d * 8 +
    (input.completionPctAvg7d ?? 50) * 0.3,
  );
  const screenTimeBalance = clamp(
    input.screenMinutesAvg7d != null
      ? Math.max(0, 100 - Math.max(0, input.screenMinutesAvg7d - 60) * 1.5)
      : 65,
  );
  const streakHealth = clamp(
    input.currentStreakDays >= 7 ? 95 :
    input.currentStreakDays >= 3 ? 75 :
    input.streakBrokenDaysAgo != null ? 35 : 50,
  );

  const components: HealthScoreComponents = {
    routineConsistency,
    learningConsistency,
    sleepConsistency,
    parentEngagement,
    screenTimeBalance,
    streakHealth,
  };

  const score = clamp(
    routineConsistency * 0.22 +
    learningConsistency * 0.2 +
    sleepConsistency * 0.15 +
    parentEngagement * 0.18 +
    screenTimeBalance * 0.1 +
    streakHealth * 0.15,
  );

  const trend7d = computeTrend(score, input.healthHistory7d);
  const trend30d = computeTrend(score, input.healthHistory30d);

  return {
    score,
    components,
    trend7d,
    trend30d,
    computedAt: new Date().toISOString(),
  };
}

function computeTrend(current: number, history: number[]): number {
  if (history.length === 0) return 0;
  const avg = history.reduce((a, b) => a + b, 0) / history.length;
  return Math.round((current - avg) * 10) / 10;
}

export function healthTrendLabel(trend7d: number): "improving" | "stable" | "declining" {
  if (trend7d >= 5) return "improving";
  if (trend7d <= -5) return "declining";
  return "stable";
}
