import {
  GLOBAL_PROACTIVE_POLICY,
  isTransactionalNotificationCategory,
} from "./proactive-policy.js";

export type GlobalProactiveFatigueReason =
  | "global_daily_cap"
  | "global_weekly_cap"
  | "recent_notification"
  | "recent_app_open";

export interface GlobalProactiveFatigueInput {
  category: string;
  /** Transactional / test-send bypass. */
  skip?: boolean;
  sentProactiveToday: number;
  sentProactiveThisWeek: number;
  lastProactiveAt: Date | null;
  lastAppOpenAt: Date | null;
  now: Date;
}

export type GlobalProactiveFatigueDecision =
  | { allow: true; reason: null }
  | { allow: false; reason: GlobalProactiveFatigueReason };

export function minutesSince(from: Date | null, now: Date): number | null {
  if (!from) return null;
  return (now.getTime() - from.getTime()) / 60000;
}

/**
 * Shared proactive frequency gate. Dedup keys still distinguish content;
 * this gate counts *all* proactive sends toward the same user budget.
 */
export function evaluateGlobalProactiveFatigue(
  input: GlobalProactiveFatigueInput,
): GlobalProactiveFatigueDecision {
  if (input.skip || isTransactionalNotificationCategory(input.category)) {
    return { allow: true, reason: null };
  }

  if (input.sentProactiveToday >= GLOBAL_PROACTIVE_POLICY.maxPerLocalDay) {
    return { allow: false, reason: "global_daily_cap" };
  }
  if (input.sentProactiveThisWeek >= GLOBAL_PROACTIVE_POLICY.maxPerRolling7Days) {
    return { allow: false, reason: "global_weekly_cap" };
  }

  const sinceLast = minutesSince(input.lastProactiveAt, input.now);
  if (
    sinceLast != null &&
    sinceLast >= 0 &&
    sinceLast < GLOBAL_PROACTIVE_POLICY.minGapMinutes
  ) {
    return { allow: false, reason: "recent_notification" };
  }

  const sinceOpen = minutesSince(input.lastAppOpenAt, input.now);
  if (
    sinceOpen != null &&
    sinceOpen >= 0 &&
    sinceOpen < GLOBAL_PROACTIVE_POLICY.recentAppOpenSuppressionMinutes
  ) {
    return { allow: false, reason: "recent_app_open" };
  }

  return { allow: true, reason: null };
}
