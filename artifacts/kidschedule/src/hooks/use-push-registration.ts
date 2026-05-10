import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  ensureNativePushReady,
  getNativePushBridge,
  getNativePushToken,
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
 *  1. KidSchedule Android WebView wrapper → uses `window.AndroidPush`
 *     (addJavascriptInterface) to read the native FCM token synchronously,
 *     and listens for `amynest-push-token` events fired by
 *     `window.onAndroidToken()` for token rotations. Platform = "android".
 *
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
          markRegistered();
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
    // Uses window.AndroidPush (addJavascriptInterface) for synchronous
    // token reads, and listens for amynest-push-token events (fired by
    // window.onAndroidToken → index.html inline script) for token rotations.
    const native = getNativePushBridge();
    if (native) {
      const tryRegister = async () => {
        if (!native.getFcmEnabled()) return;
        if (native.getPermissionStatus() !== "granted") return;
        const tok = await getNativePushToken(native);
        if (tok) await registerToken(tok, "android");
      };

      void (async () => {
        const status = await ensureNativePushReady();
        // Drain any token buffered in __pendingAndroidToken before React mounted.
        // ensureNativePushReady() already clears the buffer and warms the cache.
        if (status?.token) {
          await registerToken(status.token, "android");
        } else {
          await tryRegister();
        }
      })();

      // Also re-register on token rotation events (native calls onAndroidToken
      // again when FCM refreshes the registration token).
      const onTok = (e: Event) => {
        const detail = (e as CustomEvent<{ token: string }>).detail;
        if (detail?.token) void registerToken(detail.token, "android");
      };
      window.addEventListener("amynest-push-token", onTok);
      return () => {
        window.removeEventListener("amynest-push-token", onTok);
      };
    }

    // Web push is disabled — notifications delivered via the native FCM
    // layer in the KidSchedule Android WebView wrapper.
    return undefined;
  }, [isSignedIn, userId, authFetch]);
}
