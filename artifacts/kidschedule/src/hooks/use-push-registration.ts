import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  awaitNativePushBridge,
  ensureNativePushReady,
  getNativePushBridge,
  getNativePushToken,
  initCapacitorIOSPush,
  isAmyNestWrapper,
  isCapacitorIOS,
  resetCapacitorIOSPushState,
} from "@/lib/native-push-bridge";

const REGISTERED_KEY = "notify_device_registered_at";
function markRegistered() {
  try {
    localStorage.setItem(REGISTERED_KEY, String(Date.now()));
  } catch { /* ignore */ }
}

/**
 * Registers the device for push notifications and uploads the token to the
 * backend. Runs once per signed-in user session.
 *
 * Supports all AmyNest native shells:
 *
 *  iOS CAPACITOR: window.Capacitor (amynest-capacitor) — async permission
 *    request via PushNotifications plugin → APNs/FCM token via "registration"
 *    listener → dispatches amynest-push-token CustomEvent.
 *
 *  ANDROID NEW APK (v2+): window.AndroidPush (addJavascriptInterface) —
 *    synchronous token pull + window.onAndroidToken evaluateJavascript callback.
 *
 *  ANDROID LEGACY APK (v1): window.AmyNestPushNative (addWebMessageListener)
 *    — async message-bus protocol; getStatus action retrieves the cached token.
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

    // Determine platform for the API call
    const platform = isCapacitorIOS() ? "ios-capacitor" : "android";
    const deviceName = isCapacitorIOS() ? "AmyNest iOS" : "KidSchedule Android";

    const registerToken = async (token: string) => {
      // Capacitor fires APNs hex first; only the FCM registration token is deliverable from the API.
      if (isCapacitorIOS() && /^[0-9a-f]{64}$/i.test(token.trim())) return;

      const key = `${userId}::${token}`;
      if (lastKeyRef.current === key) return;
      try {
        const res = await authFetch(getApiUrl("/api/push/register"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, platform, deviceName }),
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

    const isNativeCapShell = (() => {
      try {
        return Capacitor.isNativePlatform();
      } catch {
        return false;
      }
    })();

    if (!isNativeCapShell && !isAmyNestWrapper()) return undefined;

    let cancelled = false;

    const runIosPushRegistration = async (): Promise<void> => {
      await initCapacitorIOSPush();
      if (cancelled) return;

      const status = await ensureNativePushReady();
      if (cancelled) return;

      if (status?.token) {
        await registerToken(status.token);
        return;
      }

      if (status?.permission === "granted") {
        const facade = {
          getFcmEnabled: () => true,
          getPermissionStatus: () => status.permission,
          getToken: () => null,
          platform: "ios" as const,
        };
        const token = await getNativePushToken(facade, 20_000);
        if (!cancelled && token) await registerToken(token);
      }
    };

    let iosVisCleanup: (() => void) | undefined;

    void (async () => {
      // ── iOS Capacitor path ────────────────────────────────────────────────
      if (isCapacitorIOS()) {
        await runIosPushRegistration();
        if (cancelled) return;

        const permAfter = getNativePushBridge()?.getPermissionStatus();
        if (permAfter !== "granted") {
          const onVis = () => {
            if (document.visibilityState !== "visible" || cancelled) return;
            void (async () => {
              resetCapacitorIOSPushState();
              await runIosPushRegistration();
            })();
          };
          document.addEventListener("visibilitychange", onVis);

          const onRegistered = () => {
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("amynest-push-registered", onRegistered);
          };
          window.addEventListener("amynest-push-registered", onRegistered);

          iosVisCleanup = () => {
            document.removeEventListener("visibilitychange", onVis);
            window.removeEventListener("amynest-push-registered", onRegistered);
          };
        }
        return;
      }

      // ── Android path (new + legacy APK) ──────────────────────────────────
      // Wait up to 8s for whichever bridge wires up first (new or legacy).
      const facade = await awaitNativePushBridge(8_000);
      if (cancelled || !facade) return;

      const status = await ensureNativePushReady();
      if (cancelled) return;

      if (status?.token) {
        await registerToken(status.token);
        return;
      }

      if (status?.permission === "granted") {
        const token = await getNativePushToken(facade, 15_000);
        if (!cancelled && token) await registerToken(token);
      }
    })();

    // Re-register on token rotation (all bridges dispatch amynest-push-token)
    const onTok = (e: Event) => {
      const detail = (e as CustomEvent<{ token: string }>).detail;
      if (detail?.token) void registerToken(detail.token);
    };
    window.addEventListener("amynest-push-token", onTok);

    return () => {
      cancelled = true;
      iosVisCleanup?.();
      window.removeEventListener("amynest-push-token", onTok);
    };
  }, [isSignedIn, userId, authFetch]);
}
