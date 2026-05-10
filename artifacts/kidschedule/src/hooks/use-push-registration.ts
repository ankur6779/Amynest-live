import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  awaitNativePushBridge,
  ensureNativePushReady,
  getNativePushToken,
  isAmyNestWrapper,
} from "@/lib/native-push-bridge";

const REGISTERED_KEY = "notify_device_registered_at";
function markRegistered() {
  try {
    localStorage.setItem(REGISTERED_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

/**
 * Registers the device for push notifications and uploads the FCM token to
 * the backend. Runs once per signed-in user session.
 *
 * Supports both APK generations transparently:
 *
 *  NEW APK (v2+): `window.AndroidPush` (addJavascriptInterface) — synchronous
 *    token pull + `window.onAndroidToken` evaluateJavascript callback for
 *    token delivery and rotation.
 *
 *  LEGACY APK (v1): `window.AmyNestPushNative` (addWebMessageListener) —
 *    async message-bus protocol; getStatus action retrieves the cached token.
 *
 * Both paths use `awaitNativePushBridge()` so the hook is robust against the
 * brief race window at page load where the bridge object may not yet exist.
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

    const registerToken = async (token: string) => {
      const key = `${userId}::${token}`;
      if (lastKeyRef.current === key) return;
      try {
        const res = await authFetch(getApiUrl("/api/push/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            platform: "android",
            deviceName: "KidSchedule Android",
          }),
        });
        if (res.ok) {
          lastKeyRef.current = key;
          markRegistered();
          try {
            window.dispatchEvent(new CustomEvent("amynest-push-registered"));
          } catch { /* ignore */ }
        }
      } catch {
        // Best-effort — never crash the app
      }
    };

    // Not inside the wrapper at all — skip silently.
    if (!isAmyNestWrapper()) return undefined;

    let cancelled = false;

    void (async () => {
      // Wait up to 8s for whichever bridge wires up first (new or legacy).
      const facade = await awaitNativePushBridge(8_000);
      if (cancelled || !facade) return;

      // Hydrate the module cache:
      //   • new APK  → drains __pendingAndroidToken, reads AndroidPush.getPushToken()
      //   • legacy APK → sends getStatus action, awaits JSON response with token
      const status = await ensureNativePushReady();
      if (cancelled) return;

      if (status?.token) {
        await registerToken(status.token);
        return;
      }

      // Token not yet available — wait for it (new: onAndroidToken event;
      // legacy: refreshToken action response dispatches amynest-push-token).
      if (status?.permission === "granted") {
        const token = await getNativePushToken(facade, 15_000);
        if (!cancelled && token) await registerToken(token);
      }
    })();

    // Re-register on token rotation (both APKs dispatch amynest-push-token).
    const onTok = (e: Event) => {
      const detail = (e as CustomEvent<{ token: string }>).detail;
      if (detail?.token) void registerToken(detail.token);
    };
    window.addEventListener("amynest-push-token", onTok);

    return () => {
      cancelled = true;
      window.removeEventListener("amynest-push-token", onTok);
    };
  }, [isSignedIn, userId, authFetch]);
}
