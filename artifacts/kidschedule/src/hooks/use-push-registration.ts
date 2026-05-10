import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  ensureNativePushReady,
  getNativePushBridge,
  getNativePushToken,
  requestNativePushPermission,
} from "@/lib/native-push-bridge";

const REGISTERED_KEY = "notify_device_registered_at";
function markRegistered() {
  try {
    localStorage.setItem(REGISTERED_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Registers the device for push notifications and uploads the token to the
 * backend. Runs once per signed-in user.
 *
 * Two paths:
 *  1. KidSchedule Android WebView wrapper → uses `window.AmyNestPushNative`
 *     bridge to obtain the native FCM token (platform="android"). Also
 *     re-registers when the native bridge fires `amynest-push-token` after
 *     a token rotation.
 *  2. Standard browser / PWA → uses Web Push via Firebase Messaging
 *     (platform="web"). Silently skips if the browser lacks support, the
 *     user has not granted permission, or the VAPID key is missing.
 */
export function usePushRegistration(): void {
  const { isSignedIn, userId } = useAuth();
  const authFetch = useAuthFetch();
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !userId) {
      lastKeyRef.current = null;
      return undefined;
    }
    if (typeof window === "undefined") return undefined;

    const registerToken = async (token: string, platform: "web" | "android") => {
      const key = `${userId}::${token}`;
      if (lastKeyRef.current === key) return;
      try {
        const res = await authFetch(getApiUrl("/api/push/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            platform,
            deviceName: platform === "android" ? "KidSchedule Android" : "Browser",
          }),
        });
        if (res.ok) {
          lastKeyRef.current = key;
          // Tell the nudge banner the device is registered so it stays hidden.
          markRegistered();
          // Notify the banner to recompute immediately (otherwise it would
          // wait until the next permission/token/mount event).
          try {
            window.dispatchEvent(new CustomEvent("amynest-push-registered"));
          } catch {
            /* ignore */
          }
        }
      } catch {
        // Best-effort — never crash the app
      }
    };

    // ── Native Android wrapper path ──────────────────────────────────────
    const native = getNativePushBridge();
    if (native) {
      // Hydrate cache then attempt initial registration (only succeeds
      // if permission is already granted). Always subscribe to permission
      // and token events so a LATER grant + token arrival triggers
      // registration without requiring a remount.
      const tryRegister = async () => {
        if (!native.getFcmEnabled()) return;
        if (native.getPermissionStatus() !== "granted") return;
        const tok = await getNativePushToken(native);
        if (tok) await registerToken(tok, "android");
      };

      void (async () => {
        await ensureNativePushReady();
        // PERMANENT FIX: when the wrapper bridge is live but permission is
        // still "default" (system dialog never fired, or user dismissed
        // it), drive the native POST_NOTIFICATIONS prompt immediately on
        // sign-in. Combined with MainActivity.askNotificationPermission()
        // on launch, this guarantees the user always sees the system
        // dialog once and any "granted" state in the OS settings flows
        // back to the bridge → token registration → server delivery.
        if (native.getPermissionStatus() === "default") {
          try {
            await requestNativePushPermission(native);
          } catch {
            /* best-effort */
          }
        }
        // Drain any token that arrived via window.onAndroidToken() before
        // React mounted (the direct-callback entry point defined in index.html).
        // This races with the message-bus path — registerToken is idempotent
        // (keyed by userId::token) so double-registration is harmless.
        const pending = window.__pendingAndroidToken;
        if (pending) {
          window.__pendingAndroidToken = null;
          await registerToken(pending, "android");
        }
        await tryRegister();
      })();

      const onTok = (e: Event) => {
        const detail = (e as CustomEvent<{ token: string }>).detail;
        if (detail?.token) void registerToken(detail.token, "android");
      };
      const onPerm = (e: Event) => {
        const detail = (e as CustomEvent<{ status: string }>).detail;
        if (detail?.status === "granted") void tryRegister();
      };
      window.addEventListener("amynest-push-token", onTok);
      window.addEventListener("amynest-push-permission", onPerm);
      return () => {
        window.removeEventListener("amynest-push-token", onTok);
        window.removeEventListener("amynest-push-permission", onPerm);
      };
    }

    // Web push is disabled — notifications are delivered exclusively through
    // the native FCM layer in the KidSchedule Android WebView wrapper.
    return undefined;
  }, [isSignedIn, userId, authFetch]);
}
