/**
 * useNotificationDeepLink — React hook that handles notification tap navigation.
 *
 * On mount:
 *   - Drains any buffered notification tap (cold-start Android case)
 *   - Subscribes to "amynest-notif-deeplink" CustomEvent (warm-start Android
 *     + iOS Capacitor tap cases)
 *
 * On each tap:
 *   - Navigates to the resolved route via wouter
 *   - Shows a brief "Opened from notification" toast
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import { drainPendingNotifTap } from "@/lib/notification-deep-link";

interface NotifDeepLinkEvent {
  deepLink: string;
  category?: string;
}

export function useNotificationDeepLink(): void {
  const [, navigate] = useLocation();

  useEffect(() => {
    // ── Cold-start buffer (Android: tap arrived before React mounted) ────────
    const pending = drainPendingNotifTap();
    if (pending?.deepLink) {
      navigate(pending.deepLink);
      toast({
        description: "Opened from notification",
        duration: 2500,
      });
    }

    // ── Warm-start + iOS tap event listener ──────────────────────────────────
    function handleDeepLink(e: Event) {
      const detail = (e as CustomEvent<NotifDeepLinkEvent>).detail;
      if (!detail?.deepLink) return;
      navigate(detail.deepLink);
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
