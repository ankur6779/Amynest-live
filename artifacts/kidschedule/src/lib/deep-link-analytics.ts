import { getApiUrl } from "@/lib/api";
import { queueClientLog } from "@/lib/client-logs";
import { getFirebaseAuth } from "@/lib/firebase";
import type { ActionTarget, DeepLinkAnalyticsEvent } from "@workspace/action-routing";

export type { DeepLinkAnalyticsEvent };

export interface DeepLinkEventMeta {
  actionTarget?: ActionTarget;
  category?: string;
  entityId?: string | number | null;
  path?: string;
  usedFallback?: boolean;
  source?: "notification" | "amy_recommendation" | "hub_card" | "campaign" | "pwa_sw" | "android" | "ios";
  notificationId?: string;
}

export function trackDeepLinkEvent(
  event: DeepLinkAnalyticsEvent,
  meta?: DeepLinkEventMeta,
): void {
  queueClientLog({
    type: event === "deep_link_fallback" ? "warn" : "info",
    message: `deep_link:${event}`,
    context: meta?.category ?? meta?.actionTarget ?? "routing",
    meta: { event, ...meta },
  });

  void postDeepLinkEvent(event, meta);
}

async function postDeepLinkEvent(
  event: DeepLinkAnalyticsEvent,
  meta?: DeepLinkEventMeta,
): Promise<void> {
  try {
    const user = getFirebaseAuth().currentUser;
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(getApiUrl("/api/notifications/deep-link-event"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event, ...meta }),
    });
  } catch {
    /* best-effort */
  }
}

export function trackNotificationClicked(meta: DeepLinkEventMeta): void {
  trackDeepLinkEvent("notification_clicked", meta);
}

export function trackActionCompleted(meta: DeepLinkEventMeta): void {
  trackDeepLinkEvent("action_completed", meta);
}
