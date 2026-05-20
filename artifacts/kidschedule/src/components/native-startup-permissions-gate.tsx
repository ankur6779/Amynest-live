import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { PushNotifications } from "@capacitor/push-notifications";
import {
  getIosNativeMicrophoneGateState,
  isCapacitorIosNative,
  requestIosMicrophoneAccess,
} from "@/lib/mic-permission-capacitor";
import { syncCapacitorPushRegistrationWithOs } from "@/lib/native-push-bridge";

const SESSION_SKIP_KEY = "amynest_native_perm_gate_skip_v1";
const PROMPTED_ONCE_KEY = "amynest_native_perm_prompted_v1";

function isCapacitorNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/**
 * On Capacitor iOS/Android, triggers the real OS permission dialogs in sequence
 * (location → microphone → notifications). No custom full-screen permission UI.
 */
export function NativeStartupPermissionsGate() {
  const isCap = useMemo(
    () => typeof window !== "undefined" && isCapacitorNative(),
    [],
  );

  const [finished, setFinished] = useState(() => {
    try {
      if (sessionStorage.getItem(SESSION_SKIP_KEY) === "1") return true;
    } catch {
      /* ignore */
    }
    return false;
  });

  const [hintVisible, setHintVisible] = useState(false);
  const startedRef = useRef(false);

  const complete = useCallback(() => {
    try {
      localStorage.setItem(PROMPTED_ONCE_KEY, "1");
    } catch {
      /* ignore */
    }
    setFinished(true);
    setHintVisible(false);
  }, []);

  useEffect(() => {
    if (!isCap || finished || startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const [geo, push] = await Promise.all([
          Geolocation.checkPermissions(),
          PushNotifications.checkPermissions(),
        ]);

        let micOk = false;
        if (Capacitor.getPlatform() === "ios") {
          const nativeMic = await getIosNativeMicrophoneGateState();
          micOk = nativeMic === "granted";
        } else {
          micOk = true;
        }

        const locOk =
          geo.location === "granted" || geo.location === "limited";
        const pushOk = push.receive === "granted";

        if (locOk && micOk && pushOk) {
          await syncCapacitorPushRegistrationWithOs();
          if (!cancelled) complete();
          return;
        }

        if (!cancelled) setHintVisible(true);

        // Microphone first on iOS — must run before Speech Coach; registers Settings row.
        if (isCapacitorIosNative()) {
          const micAfter = await getIosNativeMicrophoneGateState();
          if (micAfter !== "granted") {
            await requestIosMicrophoneAccess();
          }
        }

        if (!locOk) {
          await Geolocation.requestPermissions();
        }

        const pushResult = await PushNotifications.requestPermissions();
        if (pushResult.receive === "granted") {
          await syncCapacitorPushRegistrationWithOs();
        }
      } catch {
        /* never block the app on permission errors */
      } finally {
        if (!cancelled) complete();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCap, finished, complete]);

  if (!isCap || finished) return null;

  if (!hintVisible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center px-4 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)]"
      role="status"
      aria-live="polite"
    >
      <p className="rounded-full border border-border bg-card/95 px-4 py-2 text-center text-xs font-medium text-foreground shadow-lg backdrop-blur-sm">
        Please respond to the permission prompts from your device.
      </p>
    </div>
  );
}
