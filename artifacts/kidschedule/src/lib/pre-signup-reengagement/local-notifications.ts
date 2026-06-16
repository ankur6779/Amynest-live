/**
 * Local notification scheduling — Capacitor iOS + Android WebView bridge.
 */

import { Capacitor } from "@capacitor/core";
import { isAmyNestWrapper, isCapacitorNativePlatform, getBrowserNotificationPermission } from "@/lib/native-push-bridge";
import type { ScheduledNotif } from "./types";

export const PRE_SIGNUP_NOTIF_CATEGORY = "pre_signup_reengagement";

declare global {
  interface Window {
    AndroidLocalNotif?: {
      scheduleBatch(json: string): void;
      cancelAll(json: string): void;
      cancelCampaign(): void;
      drainPendingDeliveries(): string;
      drainPendingDismissals(): string;
      canScheduleExactAlarms(): string;
    };
    onPreSignupNotificationTapMeta?: (
      notificationId: string,
      milestone: string,
      variant: string,
    ) => void;
  }
}

export function canUsePreSignupLocalNotifications(): boolean {
  if (typeof window === "undefined") return false;
  return isCapacitorNativePlatform() || isAmyNestWrapper();
}

function isAndroidWebViewBridge(): boolean {
  return typeof window !== "undefined" && typeof window.AndroidLocalNotif !== "undefined";
}

export async function resolvePreSignupNotificationPermission(): Promise<
  "granted" | "denied" | "default"
> {
  if (isAndroidWebViewBridge()) {
    const browser = getBrowserNotificationPermission();
    if (browser === "granted") return "granted";
    if (browser === "denied") return "denied";
    return "default";
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const perm = await LocalNotifications.checkPermissions();
      if (perm.display === "granted") return "granted";
      if (perm.display === "denied") return "denied";
      return "default";
    } catch {
      return "default";
    }
  }

  const browser = getBrowserNotificationPermission();
  if (browser === "granted") return "granted";
  if (browser === "denied") return "denied";
  return "default";
}

async function scheduleCapacitorLocal(notifications: ScheduledNotif[]): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  if (notifications.length === 0) return true;

  const permission = await resolvePreSignupNotificationPermission();
  if (permission !== "granted") return false;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    await LocalNotifications.createChannel({
      id: "pre_signup_reengagement",
      name: "Signup reminders",
      description: "Gentle reminders to complete your AmyNest account setup",
      importance: 4,
      visibility: 1,
    });

    const pending = notifications.filter((n) => n.status === "pending" && n.fireAtMs > Date.now());

    if (pending.length === 0) return true;

    await LocalNotifications.schedule({
      notifications: pending.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: { at: new Date(n.fireAtMs) },
        channelId: "pre_signup_reengagement",
        extra: {
          deepLink: n.deepLink,
          category: PRE_SIGNUP_NOTIF_CATEGORY,
          milestone: n.milestone,
          variant: n.variant,
          notificationId: String(n.id),
        },
      })),
    });

    return true;
  } catch {
    return false;
  }
}

function scheduleAndroidWebView(notifications: ScheduledNotif[]): boolean {
  const bridge = window.AndroidLocalNotif;
  if (!bridge?.scheduleBatch) return false;

  if (bridge.canScheduleExactAlarms?.() === "denied" && import.meta.env.DEV) {
    console.warn("[pre-signup] Exact alarms unavailable — using inexact fallback");
  }

  const pending = notifications
    .filter((n) => n.status === "pending" && n.fireAtMs > Date.now())
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      deepLink: n.deepLink,
      fireAtMs: n.fireAtMs,
      category: PRE_SIGNUP_NOTIF_CATEGORY,
      milestone: n.milestone,
      variant: n.variant,
    }));

  try {
    bridge.scheduleBatch(JSON.stringify(pending));
    return true;
  } catch {
    return false;
  }
}

export async function schedulePreSignupLocalNotifications(
  notifications: ScheduledNotif[],
): Promise<boolean> {
  if (!canUsePreSignupLocalNotifications()) return false;

  const permission = await resolvePreSignupNotificationPermission();
  if (permission !== "granted") return false;

  if (isAndroidWebViewBridge()) {
    return scheduleAndroidWebView(notifications);
  }

  return scheduleCapacitorLocal(notifications);
}

export async function cancelPreSignupLocalNotifications(
  ids: number[],
): Promise<void> {
  if (!canUsePreSignupLocalNotifications()) return;

  if (isAndroidWebViewBridge()) {
    try {
      window.AndroidLocalNotif?.cancelAll(JSON.stringify(ids));
      window.AndroidLocalNotif?.cancelCampaign();
    } catch {
      /* ignore */
    }
    return;
  }

  if (!Capacitor.isNativePlatform()) return;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    if (ids.length > 0) {
      await LocalNotifications.cancel({ notifications: ids.map((id) => ({ id })) });
    }
  } catch {
    /* ignore */
  }
}

/** Wire Capacitor local notification tap + delivery listeners (idempotent). */
let listenersWired = false;

export async function initPreSignupLocalNotificationListeners(): Promise<void> {
  if (listenersWired || !Capacitor.isNativePlatform() || isAndroidWebViewBridge()) return;
  listenersWired = true;

  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
      const extra = (action.notification?.extra ?? {}) as Record<string, string>;
      const deepLink = extra.deepLink ?? "/sign-up";
      const category = extra.category ?? PRE_SIGNUP_NOTIF_CATEGORY;
      const notificationId = extra.notificationId ?? String(action.notification.id);

      void import("@/lib/notification-deep-link").then(({ dispatchNotifDeepLink }) => {
        dispatchNotifDeepLink(deepLink, category, {
          userInteraction: true,
          tappedAt: Date.now(),
          source: "capacitor-tap",
          notificationId,
        });
      });

      void import("@/lib/pre-signup-reengagement/storage").then(({ recordPreSignupAttribution }) => {
        recordPreSignupAttribution({
          notificationId,
          milestone: extra.milestone,
          variant: extra.variant as "A" | "B" | "C" | undefined,
        });
      });

      void import("@/lib/pre-signup-reengagement/analytics").then(({ trackPreSignupEvent }) => {
        trackPreSignupEvent(
          "notification_opened",
          {
            milestone: extra.milestone,
            variant: extra.variant,
            notification_id: notificationId,
            source: "local_capacitor",
          },
          `opened:${notificationId}`,
        );
      });
    });

    await LocalNotifications.addListener("localNotificationReceived", (notification) => {
      const extra = (notification.extra ?? {}) as Record<string, string>;
      const notificationId = extra.notificationId ?? String(notification.id);
      void import("@/lib/pre-signup-reengagement/analytics").then(({ trackPreSignupEvent }) => {
        trackPreSignupEvent(
          "notification_delivered",
          {
            milestone: extra.milestone,
            variant: extra.variant,
            notification_id: notificationId,
            source: "local_capacitor",
          },
          `delivered:${notificationId}`,
        );
      });
    });
  } catch {
    listenersWired = false;
  }
}

/** Android WebView: attribution + analytics from MainActivity.onPreSignupNotificationTapMeta */
export function wireAndroidPreSignupTapMetaHandler(): void {
  if (typeof window === "undefined") return;
  if (window.onPreSignupNotificationTapMeta) return;

  window.onPreSignupNotificationTapMeta = (notificationId, milestone, variant) => {
    void import("@/lib/pre-signup-reengagement/storage").then(({ recordPreSignupAttribution }) => {
      recordPreSignupAttribution({
        notificationId,
        milestone: milestone || undefined,
        variant: (variant as "A" | "B" | "C") || undefined,
      });
    });

    void import("@/lib/pre-signup-reengagement/analytics").then(({ trackPreSignupEvent }) => {
      trackPreSignupEvent(
        "notification_opened",
        {
          milestone: milestone || undefined,
          variant: variant || undefined,
          notification_id: notificationId,
          source: "local_android",
        },
        `opened:${notificationId}`,
      );
    });
  };
}

if (typeof window !== "undefined") {
  wireAndroidPreSignupTapMetaHandler();
}
