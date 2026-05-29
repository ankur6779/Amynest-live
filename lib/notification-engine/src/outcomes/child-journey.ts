import type { ChildLifecycleStage, OutcomeSignals } from "./types.js";

/**
 * Classify child/family lifecycle from behavioral signals.
 * Drives notification strategy intensity and category mix.
 */
export function detectChildLifecycleStage(s: OutcomeSignals): ChildLifecycleStage {
  if (s.daysSinceLastActive >= 14) return "CHURNING";
  if (s.daysSinceLastActive >= 7) return "AT_RISK";
  if (s.daysSinceLastActive >= 3 && s.daysSinceLastActive < 7 && s.accountAgeDays > 7) {
    return "AT_RISK";
  }
  if (s.daysSinceLastActive >= 5 && s.hadSevenDayStreak) return "RETURNED";

  if (s.accountAgeDays <= 7) return "NEW_USER";

  const activeScore =
    s.sessionsLast7d * 10 +
    s.lessonsCompleted7d * 8 +
    s.routineCompletionRate7d * 40 +
    Math.min(s.currentStreakDays, 14) * 3;

  if (activeScore >= 80 && s.currentStreakDays >= 7) return "POWER_USER";
  if (activeScore >= 45 || s.lessonsCompleted7d >= 3) return "ENGAGED";
  if (s.sessionsLast7d >= 2 || s.routinesCompletedToday > 0) return "ACTIVE";

  return s.accountAgeDays <= 14 ? "NEW_USER" : "AT_RISK";
}

export function strategyForStage(stage: ChildLifecycleStage): {
  maxNonCriticalPerDay: number;
  prioritizeGoals: string[];
  interventionIntensity: "low" | "medium" | "high";
} {
  switch (stage) {
    case "NEW_USER":
      return {
        maxNonCriticalPerDay: 2,
        prioritizeGoals: ["GOAL_ROUTINE_COMPLETION", "GOAL_PARENT_ENGAGEMENT"],
        interventionIntensity: "medium",
      };
    case "ACTIVE":
      return {
        maxNonCriticalPerDay: 3,
        prioritizeGoals: ["GOAL_ROUTINE_COMPLETION", "GOAL_LEARNING_COMPLETION"],
        interventionIntensity: "low",
      };
    case "ENGAGED":
      return {
        maxNonCriticalPerDay: 4,
        prioritizeGoals: ["GOAL_LEARNING_COMPLETION", "GOAL_PARENT_ENGAGEMENT"],
        interventionIntensity: "low",
      };
    case "POWER_USER":
      return {
        maxNonCriticalPerDay: 3,
        prioritizeGoals: ["GOAL_LEARNING_COMPLETION", "GOAL_SUBSCRIPTION"],
        interventionIntensity: "low",
      };
    case "AT_RISK":
      return {
        maxNonCriticalPerDay: 2,
        prioritizeGoals: ["GOAL_RETENTION", "GOAL_STREAK_RECOVERY", "GOAL_REACTIVATION"],
        interventionIntensity: "high",
      };
    case "CHURNING":
      return {
        maxNonCriticalPerDay: 1,
        prioritizeGoals: ["GOAL_REACTIVATION", "GOAL_RETENTION"],
        interventionIntensity: "high",
      };
    case "RETURNED":
      return {
        maxNonCriticalPerDay: 2,
        prioritizeGoals: ["GOAL_ROUTINE_COMPLETION", "GOAL_STREAK_RECOVERY"],
        interventionIntensity: "medium",
      };
  }
}
