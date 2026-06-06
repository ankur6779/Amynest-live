import type { NotificationCategory } from "@workspace/db";
import { jobFingerprint } from "../delivery/guard.js";

export interface CategorySlot {
  hour: number;
  minute: number;
  /** 0=Sun … 6=Sat; omit for every day */
  weekdays?: number[];
  /** Time-sensitive — never shifted by smart delivery windows */
  critical?: boolean;
}

export interface ScheduledNotificationJob {
  jobId: string;
  category: NotificationCategory;
  slot: CategorySlot;
  /** Distinguish multiple jobs sharing one category (e.g. nutrition snack vs dinner). */
  builderKey?: "snack" | "dinner" | "default";
}

/** Default local delivery slots — evaluated per user timezone (DST-safe). */
export const SCHEDULED_NOTIFICATION_JOBS: ScheduledNotificationJob[] = [
  { jobId: "morning_routine", category: "routine", slot: { hour: 7, minute: 30, critical: true } },
  { jobId: "parenting_tip", category: "parenting_tips", slot: { hour: 9, minute: 0 } },
  { jobId: "learning_activity", category: "learning_activity", slot: { hour: 10, minute: 30 } },
  { jobId: "milestone_alert", category: "milestone", slot: { hour: 11, minute: 0 } },
  { jobId: "amy_insight", category: "insights", slot: { hour: 12, minute: 30, critical: true } },
  { jobId: "snack_time", category: "nutrition", slot: { hour: 15, minute: 30 }, builderKey: "snack" },
  { jobId: "phonics_reminder", category: "phonics", slot: { hour: 16, minute: 0 } },
  { jobId: "dinner_suggestion", category: "nutrition", slot: { hour: 18, minute: 30 }, builderKey: "dinner" },
  { jobId: "engagement_sweep", category: "engagement", slot: { hour: 19, minute: 0 } },
  { jobId: "story_time", category: "story_time", slot: { hour: 20, minute: 0 } },
  { jobId: "good_night", category: "good_night", slot: { hour: 21, minute: 0, critical: true } },
  { jobId: "weekly_report", category: "weekly", slot: { hour: 10, minute: 0, weekdays: [0], critical: true } },
];

export function matchesCategorySlot(
  local: { hour: number; minute: number; weekday: number },
  slot: CategorySlot,
  preferredHour?: number | null,
  smartDeliveryEnabled = true,
): boolean {
  let hour = slot.hour;
  if (
    smartDeliveryEnabled &&
    preferredHour != null &&
    !slot.critical &&
    preferredHour >= 0 &&
    preferredHour <= 23
  ) {
    hour = preferredHour;
  }

  if (local.hour !== hour || local.minute !== slot.minute) return false;
  if (slot.weekdays && !slot.weekdays.includes(local.weekday)) return false;
  return true;
}

export function jobDedupKey(jobId: string, localDate: string): string {
  return jobFingerprint(jobId, localDate);
}
