import { getApiUrl } from "@/lib/api";
import { getFirebaseAuth } from "@/lib/firebase";

/** Best-effort: tell the API a notification was opened (adaptive engine + fatigue). */
export function recordNotificationOpened(meta?: {
  fingerprint?: string;
  notificationId?: string;
  category?: string;
  destination?: string;
}): void {
  void (async () => {
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(getApiUrl("/api/notifications/opened"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fingerprint: meta?.fingerprint ?? meta?.notificationId ?? undefined,
          notificationId: meta?.notificationId ?? undefined,
          category: meta?.category ?? undefined,
          destination: meta?.destination ?? undefined,
        }),
      });
    } catch {
      /* ignore */
    }
  })();
}

export type NotificationOutcomeEvent =
  | "routine_completed"
  | "routine_started"
  | "lesson_completed"
  | "lesson_started"
  | "subscription_started"
  | "subscription_trial_started"
  | "session_returned"
  | "streak_restored"
  | "campaign_step_completed"
  | "challenge_completed";

/** Record downstream business outcome for causal attribution. */
export function recordNotificationOutcome(
  outcomeEvent: NotificationOutcomeEvent,
  notificationLogId?: number,
): void {
  void (async () => {
    try {
      const user = getFirebaseAuth().currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      await fetch(getApiUrl("/api/notifications/outcome"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ outcomeEvent, notificationLogId }),
      });
    } catch {
      /* ignore */
    }
  })();
}
