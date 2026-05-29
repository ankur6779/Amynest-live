import type { NotificationCategory } from "@workspace/db";
import type { NotificationGoal } from "./types.js";

const CATEGORY_GOALS: Record<NotificationCategory, NotificationGoal> = {
  routine: "GOAL_ROUTINE_COMPLETION",
  routine_item: "GOAL_ROUTINE_COMPLETION",
  nutrition: "GOAL_PARENT_ENGAGEMENT",
  insights: "GOAL_PARENT_ENGAGEMENT",
  weekly: "GOAL_RETENTION",
  engagement: "GOAL_RETENTION",
  good_night: "GOAL_PARENT_ENGAGEMENT",
  parenting_tips: "GOAL_PARENT_ENGAGEMENT",
  story_time: "GOAL_LEARNING_COMPLETION",
  phonics: "GOAL_LEARNING_COMPLETION",
  learning_activity: "GOAL_LEARNING_COMPLETION",
  milestone: "GOAL_PARENT_ENGAGEMENT",
};

export function goalForCategory(category: NotificationCategory): NotificationGoal {
  return CATEGORY_GOALS[category] ?? "GOAL_PARENT_ENGAGEMENT";
}

export function categoriesForGoal(goal: NotificationGoal): NotificationCategory[] {
  return (Object.entries(CATEGORY_GOALS) as [NotificationCategory, NotificationGoal][])
    .filter(([, g]) => g === goal)
    .map(([c]) => c);
}

export function goalAlignsWithContent(
  goal: NotificationGoal,
  contentType: string,
  category: NotificationCategory,
): number {
  const catGoal = goalForCategory(category);
  if (goal === catGoal) return 25;
  if (goal === "GOAL_STREAK_RECOVERY" && (category === "routine" || category === "engagement")) {
    return 20;
  }
  if (goal === "GOAL_REACTIVATION" && contentType === "motivational") return 18;
  if (goal === "GOAL_SUBSCRIPTION" && contentType === "achievement") return 15;
  if (goal === "GOAL_LEARNING_COMPLETION" && contentType === "educational") return 22;
  if (goal === "GOAL_ROUTINE_COMPLETION" && contentType === "routine") return 22;
  return 5;
}
