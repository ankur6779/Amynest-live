import type { NotificationCategory } from "@workspace/db";

/**
 * Existing time-sensitive / required categories. Do not invent new ones.
 *
 * - routine_item: 5-min task heads-up; already bypasses intensity daily cap
 * - infant_care: infant feed/nap/vaccine scheduler with its own maxPerDay
 */
export const TRANSACTIONAL_NOTIFICATION_CATEGORIES = [
  "routine_item",
  "infant_care",
] as const satisfies readonly NotificationCategory[];

export type TransactionalNotificationCategory =
  (typeof TRANSACTIONAL_NOTIFICATION_CATEGORIES)[number];

/**
 * Scheduled / CRM / re-engagement categories that compete for attention.
 * Must share the global 1/day, 4/week, 90-minute proactive gate.
 */
export const PROACTIVE_NOTIFICATION_CATEGORIES = [
  "routine",
  "nutrition",
  "insights",
  "weekly",
  "engagement",
  "good_night",
  "parenting_tips",
  "story_time",
  "phonics",
  "learning_activity",
  "milestone",
] as const satisfies readonly NotificationCategory[];

export type ProactiveNotificationCategory =
  (typeof PROACTIVE_NOTIFICATION_CATEGORIES)[number];

export const GLOBAL_PROACTIVE_POLICY = {
  maxPerLocalDay: 1,
  maxPerRolling7Days: 4,
  minGapMinutes: 90,
  recentAppOpenSuppressionMinutes: 90,
  /** Matches existing pruneStaleTokens default. */
  staleTokenDays: 60,
} as const;

const TRANSACTIONAL_SET = new Set<string>(TRANSACTIONAL_NOTIFICATION_CATEGORIES);
const PROACTIVE_SET = new Set<string>(PROACTIVE_NOTIFICATION_CATEGORIES);

export function isTransactionalNotificationCategory(
  category: string | null | undefined,
): boolean {
  return category != null && TRANSACTIONAL_SET.has(category);
}

export function isProactiveNotificationCategory(
  category: string | null | undefined,
): boolean {
  return category != null && PROACTIVE_SET.has(category);
}

export function isStalePushToken(
  lastSeenAt: Date | null | undefined,
  now = new Date(),
  maxAgeDays = GLOBAL_PROACTIVE_POLICY.staleTokenDays,
): boolean {
  if (!lastSeenAt) return true;
  const ageMs = now.getTime() - lastSeenAt.getTime();
  return ageMs >= maxAgeDays * 24 * 60 * 60 * 1000;
}
