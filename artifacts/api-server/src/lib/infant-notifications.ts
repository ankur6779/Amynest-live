/**
 * Infant smart notification scheduler — hooks into notification dispatch.
 * @deprecated Use infantNotificationScheduler + infantNotificationCandidates.
 */
export type InfantNotificationKind =
  | "nap_window"
  | "feed_reminder"
  | "vaccine_due"
  | "milestone_tip"
  | "sleep_drift";

export { infantNotificationDedupKey } from "./infantNotificationCandidates.js";
export { runInfantNotificationTick } from "./infantNotificationScheduler.js";
