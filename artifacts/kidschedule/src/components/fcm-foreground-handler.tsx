import { useEffect } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useToast } from "@/hooks/use-toast";

/**
 * Handles FCM messages that arrive while the app is in the foreground.
 *
 * Background: Firebase's service worker (`onBackgroundMessage`) only fires
 * when the tab is hidden or closed. When the app is open, FCM delivers the
 * message directly to the page via `onMessage` — the service worker is
 * bypassed and NO system notification appears automatically.
 *
 * Fix: on each incoming `onMessage` payload we do two things:
 *  1. Show a real OS-level notification banner via
 *     `serviceWorkerRegistration.showNotification()`. This produces the
 *     same heads-up popup the user would see in background, even while the
 *     tab is active and focused.
 *  2. Also show an in-app toast so the notification is visible inside the
 *     app UI (useful when the OS has suppressed banners, e.g. Focus mode).
 *
 * Rendered once at the app root (AppCore). Returns null — no UI of its own.
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
          const category =
            payload.data && typeof payload.data["category"] === "string"
              ? payload.data["category"]
              : "amynest";

          // ── 1. OS-level system notification banner ──────────────────────
          // `onMessage` fires only in the foreground; the SW is skipped, so
          // we must explicitly ask the active service worker registration to
          // show the notification. This is the same call the SW makes in
          // `onBackgroundMessage`, so the result looks identical to the user.
          navigator.serviceWorker.ready
            .then((reg) => {
              // Cast to `object` so TS doesn't error on `renotify` / `badge`
              // which are valid NotificationOptions fields in all modern
              // browsers but missing from older lib.dom typings.
              return reg.showNotification(title, {
                body: body || undefined,
                icon: "/pwa-icon-192.png",
                badge: "/pwa-icon-192.png",
                tag: category,
                renotify: true,
                data: payload.data ?? {},
              } as object as NotificationOptions);
            })
            .catch(() => {
              // Service worker not ready yet — toast fallback below still fires.
            });

          // ── 2. In-app toast ─────────────────────────────────────────────
          // Keeps the message visible inside the UI even when the OS has
          // suppressed banners (e.g. Do Not Disturb / Focus mode).
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
