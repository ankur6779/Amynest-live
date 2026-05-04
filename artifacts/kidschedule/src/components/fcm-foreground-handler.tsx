import { useEffect } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useToast } from "@/hooks/use-toast";

/**
 * Handles FCM messages that arrive while the app is in the foreground.
 *
 * Background: Firebase's service worker (`onBackgroundMessage`) only fires
 * when the tab is hidden or closed. When the app is open, FCM delivers the
 * message directly to the page via `onMessage` — but it does NOT
 * automatically show a system notification (the service worker is bypassed).
 * Without this handler, foreground notifications are silently dropped.
 *
 * This component subscribes to `onMessage` and surfaces each arriving FCM
 * payload as an in-app toast so the user always sees the notification
 * regardless of whether the app tab is open or in the background.
 *
 * Rendered once at the app level (AppCore). Returns null — no UI of its own.
 */
export function FcmForegroundHandler() {
  const { isSignedIn } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isSignedIn) return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission !== "granted") return;

    let unsubscribe: (() => void) | null = null;

    void (async () => {
      try {
        const [{ getMessaging, onMessage }, { firebaseApp }] = await Promise.all([
          import("firebase/messaging"),
          import("@/lib/firebase"),
        ]);
        const messaging = getMessaging(firebaseApp);

        unsubscribe = onMessage(messaging, (payload) => {
          const title = payload.notification?.title ?? "AmyNest";
          const body = payload.notification?.body ?? "";
          toast({
            title,
            description: body || undefined,
            duration: 6000,
          });
        });
      } catch {
        // Best-effort — never crash the app over a missing push listener.
      }
    })();

    return () => {
      unsubscribe?.();
    };
  }, [isSignedIn, toast]);

  return null;
}
