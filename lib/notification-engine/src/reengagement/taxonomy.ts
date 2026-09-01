/**
 * Signed-in re-engagement taxonomy. One category per send.
 * Priority order is the array order (highest first).
 */
export const REENGAGEMENT_CATEGORIES = [
  "UNFINISHED_ACTION",
  "TODAY_PLAN",
  "CHILD_CONTEXT",
  "ROUTINE_CONTINUITY",
  "AMY_COMPANION",
  "WEEKLY_RECAP",
  "WINBACK",
  "GENERIC_REMINDER",
] as const;

export type ReengagementCategory = (typeof REENGAGEMENT_CATEGORIES)[number];

export const REENGAGEMENT_CATEGORY_PRIORITY: Record<ReengagementCategory, number> = {
  UNFINISHED_ACTION: 100,
  TODAY_PLAN: 90,
  CHILD_CONTEXT: 80,
  ROUTINE_CONTINUITY: 70,
  AMY_COMPANION: 60,
  WEEKLY_RECAP: 50,
  WINBACK: 40,
  GENERIC_REMINDER: 10,
};

export const REENGAGEMENT_DEEP_LINKS = {
  todayPlan: "/routines",
  amy: "/assistant",
  hub: "/parenting-hub",
  speech: "/speech-coach",
  learning: "/study",
  weekly: "/progress",
  onboarding: "/routines/generate",
  homeFallback: "/parenting-hub",
} as const;

export function categoryCooldownKey(category: ReengagementCategory): string {
  return category.toLowerCase();
}
