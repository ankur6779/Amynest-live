import { track, type AnalyticsEventName } from "@/lib/analytics";

export type RetentionAnalyticsEvent = Extract<
  AnalyticsEventName,
  | "daily_checkin"
  | "streak_started"
  | "streak_extended"
  | "streak_lost"
  | "reward_claimed"
  | "goal_completed"
  | "weekly_summary_viewed"
  | "resume_clicked"
  | "notification_opened"
  | "return_after_push"
  | "achievement_unlocked_retention"
  | "inactive_days"
  | "winback_opened"
>;

export function trackRetentionEvent(
  event: RetentionAnalyticsEvent,
  props: Record<string, string | number | boolean | undefined> = {},
): void {
  track(event, props as never);
}
