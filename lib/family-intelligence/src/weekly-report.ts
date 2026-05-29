import type { FamilyHealthScore, FamilyIntelligenceInput, WeeklyFamilyReport } from "./types.js";
import { healthTrendLabel } from "./health-score.js";

export function generateWeeklyReport(
  input: FamilyIntelligenceInput,
  health: FamilyHealthScore,
): WeeklyFamilyReport {
  const weekKey = input.localDate.slice(0, 7);
  const wins: string[] = [];
  const risks: string[] = [];
  const achievements: string[] = [];
  const recommendations: string[] = [];

  if (input.routineCompletionRate7d >= 0.7) {
    wins.push(`${input.childName} completed ${Math.round(input.routineCompletionRate7d * 100)}% of routines this week.`);
  } else if (input.routineCompletionRate7d < 0.4) {
    risks.push("Routine consistency dropped — consider simplifying to 3 tasks.");
  }

  if (input.lessonsCompleted7d >= 3) {
    wins.push(`${input.lessonsCompleted7d} learning sessions completed.`);
  } else if (input.lessonsCompleted7d === 0) {
    risks.push("No learning sessions this week.");
  }

  if (input.currentStreakDays >= 7) {
    achievements.push(`${input.currentStreakDays}-day streak active.`);
  }

  if (input.strongSubjects.length > 0) {
    achievements.push(`Strong progress in ${input.strongSubjects.join(", ")}.`);
  }

  if (input.weakSubjects.length > 0) {
    recommendations.push(`Focus 10 minutes on ${input.weakSubjects[0]} at peak focus time.`);
  }

  if (input.streakBrokenDaysAgo != null) {
    recommendations.push("One small routine win today rebuilds the streak.");
  }

  if (input.parentGoals.includes("improve_sleep") && input.sleepQualityAvg7d != null && input.sleepQualityAvg7d < 3) {
    risks.push("Sleep quality below target — try earlier wind-down.");
    recommendations.push("Move screens off 30 minutes before bed.");
  }

  if (input.parentGoals.includes("reduce_screen_time") && input.screenMinutesAvg7d != null && input.screenMinutesAvg7d > 90) {
    risks.push("Screen time above recommended range.");
  }

  const trend = healthTrendLabel(health.trend7d);
  if (trend === "improving") {
    wins.push("Family health score is trending up.");
  } else if (trend === "declining") {
    risks.push("Family health score is declining — early intervention recommended.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Keep the current rhythm — consistency is working.");
  }

  return {
    weekKey,
    wins,
    risks,
    achievements,
    recommendations,
    healthScore: health.score,
    healthTrend: health.trend7d,
  };
}
