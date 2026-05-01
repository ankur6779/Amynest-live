import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import {
  ensureNativePushReady,
  getNativePushBridge,
  registerNativePushToken,
  requestNativePushPermission,
  type NativePushPermission,
} from "@/lib/native-push-bridge";

const DISMISS_KEY = "notify_nudge_dismissed_until";
const REGISTERED_KEY = "notify_device_registered_at";
const SNOOZE_DAYS = 3;
const REVERIFY_DAYS = 7;

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    return Date.now() < parseInt(raw, 10);
  } catch {
    return false;
  }
}
function snooze() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + SNOOZE_DAYS * 86400000));
  } catch {}
}
function clearDismiss() {
  try { localStorage.removeItem(DISMISS_KEY); } catch {}
}
function markRegistered() {
  try { localStorage.setItem(REGISTERED_KEY, String(Date.now())); } catch {}
}
function isRecentlyRegistered(): boolean {
  try {
    const raw = localStorage.getItem(REGISTERED_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    return Date.now() - ts < REVERIFY_DAYS * 86400000;
  } catch {
    return false;
  }
}

type BannerState = "hidden" | "ask" | "denied" | "reconnect";

export function NotificationNudgeBanner() {
  const { isSignedIn, userId } = useAuth();
  const authFetch = useAuthFetch();

  const computeState = useCallback((): BannerState => {
    if (!isSignedIn || !userId) return "hidden";
    if (typeof window === "undefined") return "hidden";

    // Native bridge (KidSchedule Android TWA wrapper) takes precedence —
    // the WebView has no Web Notification API, so we drive everything from
    // the native FCM permission state.
    const native = getNativePushBridge();
    if (native) {
      const perm: NativePushPermission = native.getPermissionStatus();
      if (perm === "denied") return "denied";
      if (perm === "default") return "ask";
      if (isRecentlyRegistered()) return "hidden";
      return "reconnect";
    }

    if (!("Notification" in window)) return "hidden";
    const perm = Notification.permission;
    if (perm === "denied") return "denied";
    if (perm === "default") return "ask";
    // permission === "granted"
    // Hide ONLY if THIS device has successfully registered in last 7 days.
    // Otherwise show reconnect — the DB token may be stale (FCM tokens expire).
    if (isRecentlyRegistered()) return "hidden";
    return "reconnect";
  }, [isSignedIn, userId]);

  const [state, setState] = useState<BannerState>(() => computeState());
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setState(computeState());
    setDismissed(isDismissed());
    // Hydrate the native bridge cache so subsequent renders see the real
    // permission/token instead of the "default" placeholder.
    let cancelled = false;
    void ensureNativePushReady().then(() => {
      if (!cancelled) setState(computeState());
    });

    // Re-evaluate when the native bridge fires permission/token updates,
    // or when the push hook signals a successful background registration.
    const recompute = () => setState(computeState());
    window.addEventListener("amynest-push-permission", recompute);
    window.addEventListener("amynest-push-token", recompute);
    window.addEventListener("amynest-push-registered", recompute);
    return () => {
      cancelled = true;
      window.removeEventListener("amynest-push-permission", recompute);
      window.removeEventListener("amynest-push-token", recompute);
      window.removeEventListener("amynest-push-registered", recompute);
    };
  }, [computeState]);

  const requestAndRegister = async () => {
    setWorking(true);
    try {
      // ── KidSchedule Android WebView wrapper path ────────────────────────
      // The WebView has no Web Notification API, so we drive the
      // POST_NOTIFICATIONS prompt + FCM token registration through the
      // native bridge instead.
      const native = getNativePushBridge();
      if (native) {
        const perm = await requestNativePushPermission(native);
        if (perm !== "granted") {
          setState("denied");
          setWorking(false);
          return;
        }
        const ok = await registerNativePushToken(
          authFetch,
          getApiUrl("/api/push/register"),
        );
        if (ok) {
          markRegistered();
          clearDismiss();
          setState("hidden");
        } else {
          // Permission granted but token registration failed (FCM token
          // still provisioning, no Play Services, network error). Snooze
          // the nudge briefly — usePushRegistration's onNewToken listener
          // will retry once the token arrives, at which point a fresh
          // registration sets REGISTERED_KEY and the banner stays hidden.
          snooze();
          setDismissed(true);
        }
        setWorking(false);
        return;
      }

      // ── Standard browser / PWA path ─────────────────────────────────────
      // Request OS-level permission (triggers native dialog on Android/iOS)
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        setWorking(false);
        return;
      }

      // Try to get a fresh FCM token and register it server-side.
      // Best-effort: in pure WebView this may fail, but the OS permission is
      // already granted which is the primary goal.
      let registeredOk = false;
      try {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
        if (vapidKey) {
          const { getWebPushToken } = await import("@/lib/firebase");
          const token = await getWebPushToken(vapidKey);
          if (token) {
            const res = await authFetch(getApiUrl("/api/push/register"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token,
                platform: "web",
                deviceName: navigator.userAgent.slice(0, 100),
              }),
            });
            if (res.ok) registeredOk = true;
          }
        }
      } catch {
        // FCM token may not be obtainable in WebView — that's OK
      }

      if (registeredOk) {
        markRegistered();
        clearDismiss();
        setState("hidden");
      } else {
        // Permission granted but token registration failed. Mark as registered
        // anyway so we don't keep nagging — at least OS notifications work.
        markRegistered();
        clearDismiss();
        setState("hidden");
      }
    } catch {
      setState("denied");
    }
    setWorking(false);
  };

  const handleDismiss = () => {
    snooze();
    setDismissed(true);
  };

  if (dismissed || state === "hidden") return null;

  if (state === "denied") {
    return (
      <div
        className="relative flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
        style={{
          background: "linear-gradient(135deg,#FEF2F2,#FFF7ED)",
          border: "1px solid rgba(239,68,68,0.25)",
        }}
      >
        <div
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <BellOff className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-700 text-sm leading-snug">
            Notifications blocked hain
          </p>
          <p className="text-red-500 text-xs mt-0.5 leading-relaxed">
            Phone Settings → Apps → KidSchedule → Notifications → <strong>Allow</strong>
          </p>
        </div>
        <button onClick={handleDismiss} className="shrink-0 p-1 rounded-full" aria-label="Dismiss">
          <X className="w-4 h-4 text-red-300" />
        </button>
      </div>
    );
  }

  if (state === "reconnect") {
    return (
      <div
        className="relative flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)",
          border: "1px solid rgba(245,158,11,0.3)",
        }}
      >
        <div
          className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}
        >
          <RefreshCw className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm leading-snug">
            🔔 Notifications reconnect karo
          </p>
          <p className="text-amber-700 text-xs mt-0.5 leading-relaxed">
            Reminders setup nahi hai. Ek tap mein fresh setup ho jayega.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <button
            onClick={requestAndRegister}
            disabled={working}
            className="px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg,#F59E0B,#EF4444)",
              boxShadow: "0 3px 10px rgba(245,158,11,0.35)",
              opacity: working ? 0.7 : 1,
            }}
          >
            {working ? "Wait…" : "Reconnect"}
          </button>
          <button onClick={handleDismiss} className="text-[11px] font-medium text-amber-600">
            Later
          </button>
        </div>
        <button onClick={handleDismiss} className="absolute top-2 right-2 p-0.5 rounded-full" aria-label="Dismiss">
          <X className="w-3 h-3 text-amber-400" />
        </button>
      </div>
    );
  }

  // state === "ask"
  return (
    <div
      className="relative flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: "linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 60%,#FDF2F8 100%)",
        border: "1px solid rgba(99,102,241,0.25)",
      }}
    >
      <div
        className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#6366F1,#A855F7)" }}
      >
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-indigo-900 text-sm leading-snug">
          🔔 Routine reminders enable karo!
        </p>
        <p className="text-indigo-500 text-xs mt-0.5 leading-relaxed">
          Bedtime, meals aur routines time pe yaad dilayenge.
        </p>
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <button
          onClick={requestAndRegister}
          disabled={working}
          className="px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg,#6366F1,#A855F7)",
            boxShadow: "0 3px 10px rgba(99,102,241,0.35)",
            opacity: working ? 0.7 : 1,
          }}
        >
          {working ? "Wait…" : "Allow"}
        </button>
        <button onClick={handleDismiss} className="text-[11px] font-medium text-indigo-400">
          Later
        </button>
      </div>
      <button onClick={handleDismiss} className="absolute top-2 right-2 p-0.5 rounded-full" aria-label="Dismiss">
        <X className="w-3 h-3 text-indigo-300" />
      </button>
    </div>
  );
}
