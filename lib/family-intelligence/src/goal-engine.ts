import type { FamilyGoal, FamilyGoalType, FamilyIntelligenceInput } from "./types.js";

export function alignGoalsWithSignals(input: FamilyIntelligenceInput): FamilyGoal[] {
  const goals = [...input.activeGoals];

  for (const g of goals) {
    g.progress = computeGoalProgress(g, input);
  }

  const existingTypes = new Set(goals.map((g) => g.type));

  if (!existingTypes.has("routine") && input.routineCompletionRate7d < 0.6) {
    goals.push(defaultGoal("routine", input));
  }
  if (!existingTypes.has("reading") && input.weakSubjects.includes("english")) {
    goals.push(defaultGoal("reading", input));
  }

  return goals;
}

function computeGoalProgress(goal: FamilyGoal, input: FamilyIntelligenceInput): number {
  switch (goal.type) {
    case "routine":
      return Math.round(input.routineCompletionRate7d * goal.targetValue);
    case "reading":
    case "learning":
      return Math.min(goal.targetValue, input.lessonsCompleted7d);
    case "screen_time":
      if (input.screenMinutesAvg7d == null) return 0;
      return Math.max(0, goal.targetValue - input.screenMinutesAvg7d);
    default:
      return goal.progress;
  }
}

function defaultGoal(type: FamilyGoalType, input: FamilyIntelligenceInput): FamilyGoal {
  switch (type) {
    case "routine":
      return {
        id: `auto_routine_${input.localDate}`,
        type: "routine",
        target: "Complete 5 routine days this week",
        progress: Math.round(input.routineCompletionRate7d * 7),
        targetValue: 5,
        unit: "days",
        active: true,
      };
    case "reading":
      return {
        id: `auto_reading_${input.localDate}`,
        type: "reading",
        target: "3 reading sessions this week",
        progress: input.lessonsCompleted7d,
        targetValue: 3,
        unit: "sessions",
        active: true,
      };
    default:
      return {
        id: `auto_${type}`,
        type,
        target: "Weekly goal",
        progress: 0,
        targetValue: 3,
        unit: "sessions",
        active: true,
      };
  }
}

export function goalSurfacesForType(type: FamilyGoalType): string[] {
  switch (type) {
    case "routine": return ["routine", "notifications"];
    case "reading": return ["learning_zone", "parent_hub"];
    case "learning": return ["learning_zone", "notifications"];
    case "screen_time": return ["parent_hub", "routine"];
  }
}
