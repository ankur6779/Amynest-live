import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";

/**
 * Registers the browser for FCM web push and uploads the token to the backend.
 * Runs once per signed-in user. Silently skips if:
 *  - Browser doesn't support notifications / service workers / PushManager
 *  - User denies permission
 *  - VAPID key is missing
 */
export function usePushRegistration(): void {
  const { isSignedIn, userId } = useAuth();
  const authFetch = useAuthFetch();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      lastKeyRef.current = null;
      return;
    }

    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      return;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
    if (!vapidKey) return;

    void (async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const { getWebPushToken } = await import("@/lib/firebase");
        const token = await getWebPushToken(vapidKey);
        if (!token) return;

        const key = `${userId}::${token}`;
        if (lastKeyRef.current === key) return;

        const res = await authFetch(getApiUrl("/api/push/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, platform: "web", deviceName: "Browser" }),
        });

        if (res.ok) {
          lastKeyRef.current = key;
        }
      } catch {
        // Best-effort — never crash the app
      }
    })();
  }, [isSignedIn, userId, authFetch]);
}
