/**
 * useNotificationDeepLink — handles notification tap navigation (user tap only).
 *
 * On mount:
 *   - Drains any buffered notification tap (cold-start Android case)
 *   - Subscribes to "amynest-notif-deeplink" CustomEvent (warm-start Android + iOS)
 *
 * Navigation runs through the orchestrator + notification guard (no foreground auto-nav).
 */

import { useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { drainPendingNotifTap } from "@/lib/notification-deep-link";
import { normalizeRoutePath } from "@/lib/navigation-stack";
import {
  consumeNotificationNavigation,
  evaluateNotificationNavigation,
  type NotificationNavRequest,
} from "@/lib/notification-navigation-guard";
import {
  registerNavigationListener,
  safeNavigate,
  unregisterNavigationListener,
} from "@/lib/navigation-orchestrator";
import { logNavEvent } from "@/lib/navigation-log";
import { recordNotificationOpened } from "@/lib/notification-engagement";
import { trackNotificationClicked, trackDeepLinkEvent } from "@/lib/deep-link-analytics";
import { recordInfantNotificationOutcomeFireAndForget } from "@/lib/infant-notification-api";
import { createNotificationIntent } from "@/lib/intent-recovery-client";

interface NotifDeepLinkEvent {
  deepLink: string;
  category?: string;
  actionTarget?: string;
  entityId?: string;
  userInteraction?: boolean;
  notificationId?: string;
  tappedAt?: number;
  source?: NotificationNavRequest["source"];
  data?: Record<string, string>;
}

function handleNotificationTap(
  navigateFrom: string,
  payload: NotifDeepLinkEvent,
  eventSource: NotificationNavRequest["source"],
): void {
  const req: NotificationNavRequest = {
    deepLink: payload.deepLink,
    category: payload.category,
    userInteraction: payload.userInteraction === true,
    notificationId: payload.notificationId,
    tappedAt: payload.tappedAt,
    source: payload.source ?? eventSource,
  };

  const decision = evaluateNotificationNavigation(req);
  logNavEvent("notif-nav-evaluate", {
    allow: decision.allow,
    reason: decision.reason,
    resolvedPath: decision.resolvedPath,
    source: req.source,
  });

  if (!decision.allow) {
    if (
      decision.reason === "already-on-target" &&
      req.userInteraction === true
    ) {
      consumeNotificationNavigation(req);
      if (req.userInteraction === true) {
        recordNotificationOpened();
      }
      toast({
        description: "Opened from notification",
        duration: 2500,
      });
    }
    return;
  }

  const navigated = safeNavigate(navigateFrom, decision.resolvedPath, {
    replace: true,
    source: "notif-deeplink",
    trigger: "notification",
  });

  if (!navigated) return;

  consumeNotificationNavigation(req);
  if (req.userInteraction === true) {
    recordNotificationOpened();
    if (payload.category === "infant_care") {
      recordInfantNotificationOutcomeFireAndForget({
        action: "opened",
        kind: payload.data?.infantKind,
        childId: payload.data?.childId ? Number(payload.data.childId) : undefined,
      });
    }
    trackNotificationClicked({
      category: payload.category,
      path: decision.resolvedPath,
      source: "notification",
    });
    trackDeepLinkEvent("deep_link_opened", {
      category: payload.category,
      path: decision.resolvedPath,
      source: "notification",
    });
    void createNotificationIntent(decision.resolvedPath, payload);
  }
  toast({
    description: "Opened from notification",
    duration: 2500,
  });
}

export function useNotificationDeepLink(): void {
  useEffect(() => {
    registerNavigationListener("useNotificationDeepLink");

    const navigateFrom = () =>
      normalizeRoutePath(
        typeof window !== "undefined" ? window.location.pathname : "/",
      );

    function consumePendingTap(): void {
      const pending = drainPendingNotifTap();
      if (!pending?.deepLink && !pending?.category) return;
      handleNotificationTap(
        navigateFrom(),
        {
          deepLink: pending.deepLink,
          category: pending.category,
          userInteraction: pending.userInteraction ?? false,
          notificationId: pending.notificationId,
          tappedAt: pending.tappedAt,
          source:
            (pending.source as NotificationNavRequest["source"]) ??
            "pending-buffer",
          data: pending.data,
        },
        "pending-buffer",
      );
    }

    consumePendingTap();

    function handleDeepLink(e: Event) {
      const detail = (e as CustomEvent<NotifDeepLinkEvent>).detail;
      if (!detail?.deepLink && !detail?.category) return;
      handleNotificationTap(navigateFrom(), detail, "android-tap");
    }

    window.addEventListener("amynest-notif-deeplink", handleDeepLink);
    return () => {
      window.removeEventListener("amynest-notif-deeplink", handleDeepLink);
      unregisterNavigationListener("useNotificationDeepLink");
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
