/**
 * Infant smart notification scheduler — hooks into existing dispatch service.
 * Respects per-user prefs stored client-side (synced via localStorage key pattern)
 * and global notification_preferences quiet hours.
 */
import { logger } from "./logger";

export type InfantNotificationKind =
  | "nap_window"
  | "feed_reminder"
  | "vaccine_due"
  | "milestone_tip"
  | "sleep_drift";

export function infantNotificationDedupKey(
  childId: number,
  kind: InfantNotificationKind,
  bucket: string,
): string {
  return `infant:${childId}:${kind}:${bucket}`;
}

/** Placeholder for cron integration — logs intent until push copy is wired. */
export async function scheduleInfantNotification(input: {
  userId: string;
  childId: number;
  kind: InfantNotificationKind;
  title: string;
  body: string;
  deepLink?: string;
}): Promise<void> {
  logger.info(
    {
      evt: "infant_notification.schedule",
      userId: input.userId,
      childId: input.childId,
      kind: input.kind,
    },
    input.title,
  );
  // Fan-out via notificationDispatchService when cron worker evaluates infant logs.
}
