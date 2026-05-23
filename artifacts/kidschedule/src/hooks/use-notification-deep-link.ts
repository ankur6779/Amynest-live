/**
 * useNotificationDeepLink — React hook that handles notification tap navigation.
 *
 * On mount:
 *   - Drains any buffered notification tap (cold-start Android case)
 *   - Subscribes to "amynest-notif-deeplink" CustomEvent (warm-start Android
 *     + iOS Capacitor tap cases)
 *
 * On each tap:
 *   - Navigates to the resolved route via guarded app navigation
 *   - Shows a brief "Opened from notification" toast
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { drainPendingNotifTap } from "@/lib/notification-deep-link";
import { appNavigate } from "@/lib/safe-navigation";
import { normalizeRoutePath } from "@/lib/navigation-stack";

interface NotifDeepLinkEvent {
  deepLink: string;
  category?: string;
}

function navigateFromNotification(
  navigate: ReturnType<typeof useLocation>[1],
  deepLink: string,
): void {
  const from = normalizeRoutePath(
    typeof window !== "undefined" ? window.location.pathname : "/",
  );
  appNavigate(navigate, from, deepLink, {
    replace: true,
    source: "notif-deeplink",
  });
}

export function useNotificationDeepLink(): void {
  const [, navigate] = useLocation();

  useEffect(() => {
    const pending = drainPendingNotifTap();
    if (pending?.deepLink) {
      navigateFromNotification(navigate, pending.deepLink);
      toast({
        description: "Opened from notification",
        duration: 2500,
      });
    }

    function handleDeepLink(e: Event) {
      const detail = (e as CustomEvent<NotifDeepLinkEvent>).detail;
      if (!detail?.deepLink) return;
      navigateFromNotification(navigate, detail.deepLink);
      toast({
        description: "Opened from notification",
        duration: 2500,
      });
    }

    window.addEventListener("amynest-notif-deeplink", handleDeepLink);
    return () => {
      window.removeEventListener("amynest-notif-deeplink", handleDeepLink);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
