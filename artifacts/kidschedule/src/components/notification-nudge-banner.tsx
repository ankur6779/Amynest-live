import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, X, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";

const DISMISS_KEY = "notify_nudge_dismissed_until";
const SNOOZE_DAYS = 3;

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
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  } catch {}
}

function clearDismiss() {
  try { localStorage.removeItem(DISMISS_KEY); } catch {}
}

type BannerState = "hidden" | "ask" | "denied" | "reconnect";

function getNotifPermission(): NotificationPermission | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return Notification.permission;
}

export function NotificationNudgeBanner() {
  const { isSignedIn, userId } = useAuth();
  const authFetch = useAuthFetch();

  const [state, setState] = useState<BannerState>("hidden");
  const [dismissed, setDismissed] = useState(() => isDismissed());
  const [working, setWorking] = useState(false);

  const computeState = useCallback(async () => {
    if (!isSignedIn || !userId) { setState("hidden"); return; }
    if (typeof window === "undefined" || !("Notification" in window)) {
      setState("hidden"); return;
    }
    const perm = Notification.permission;
    if (perm === "denied") { setState("denied"); return; }
    if (perm === "default") { setState("ask"); return; }

    // permission === "granted" — check if we have a registered FCM token
    // If no token on server, show a soft "reconnect" nudge
    try {
      const res = await authFetch(getApiUrl("/api/push/status"), { method: "GET" });
      if (res.ok) {
        const data = (await res.json()) as { registered: boolean };
        if (!data.registered) { setState("reconnect"); return; }
      }
    } catch {
      // can't reach server — don't show reconnect nudge
    }
    setState("hidden");
  }, [isSignedIn, userId, authFetch]);

  useEffect(() => {
    if (dismissed) return;
    void computeState();
  }, [computeState, dismissed]);

  const requestAndRegister = async () => {
    setWorking(true);
    try {
      // 1. Request OS-level permission (triggers native Android dialog)
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState("denied");
        setWorking(false);
        return;
      }

      // 2. Try to get FCM token and register (best-effort; may fail in pure WebView)
      try {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
        if (vapidKey) {
          const { getWebPushToken } = await import("@/lib/firebase");
          const token = await getWebPushToken(vapidKey);
          if (token) {
            await authFetch(getApiUrl("/api/push/register"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, platform: "web", deviceName: navigator.userAgent.slice(0, 100) }),
            });
          }
        }
      } catch {
        // Token registration failed (common in WebView) — permission still granted
      }

      clearDismiss();
      setState("hidden");
    } catch {
      setState("denied");
    }
    setWorking(false);
  };

  const handleDismiss = () => { snooze(); setDismissed(true); };

  if (dismissed || state === "hidden") return null;

  if (state === "denied") {
    return (
      <div
        className="relative flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
        style={{
          background: "linear-gradient(135deg,#FEF2F2,#FFF7ED)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: "rgba(239,68,68,0.12)" }}>
          <BellOff className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-700 text-sm leading-snug">Notifications blocked hain</p>
          <p className="text-red-500 text-xs mt-0.5 leading-relaxed">
            Enable karne ke liye: <strong>Phone Settings → Apps → KidSchedule → Notifications → Allow</strong>
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
          border: "1px solid rgba(245,158,11,0.25)",
        }}
      >
        <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#F59E0B,#EF4444)" }}>
          <RefreshCw className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 text-sm leading-snug">🔔 Notifications reconnect karo</p>
          <p className="text-amber-600 text-xs mt-0.5">Permission to hai, par reminders set nahi hue. Ek baar reconnect karo.</p>
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
          <button onClick={handleDismiss} className="text-[11px] font-medium text-amber-500">Later</button>
        </div>
        <button onClick={handleDismiss} className="absolute top-2 right-2 p-0.5 rounded-full" aria-label="Dismiss">
          <X className="w-3 h-3 text-amber-300" />
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
        border: "1px solid rgba(99,102,241,0.2)",
      }}
    >
      <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg,#6366F1,#A855F7)" }}>
        <Bell className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-indigo-900 text-sm leading-snug">🔔 Routine reminders enable karo!</p>
        <p className="text-indigo-500 text-xs mt-0.5 leading-relaxed">
          Amy aapko bedtime, meals aur routines ka time pe yaad dilayegi.
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
        <button onClick={handleDismiss} className="text-[11px] font-medium text-indigo-400">Later</button>
      </div>
      <button onClick={handleDismiss} className="absolute top-2 right-2 p-0.5 rounded-full" aria-label="Dismiss">
        <X className="w-3 h-3 text-indigo-300" />
      </button>
    </div>
  );
}
