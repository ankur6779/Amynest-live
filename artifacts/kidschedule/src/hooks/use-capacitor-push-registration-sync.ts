import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { syncCapacitorPushRegistrationWithOs } from "@/lib/native-push-bridge";

/**
 * If the user already granted notification permission (e.g. on a prior launch) but
 * never signed in, `initCapacitorIOSPush()` may not have run — re-sync APNs/FCM
 * registration on cold start so Settings → Notifications lists the app.
 */
export function useCapacitorPushRegistrationSync(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Capacitor.isNativePlatform()) return;
    void syncCapacitorPushRegistrationWithOs();
  }, []);
}
