import { useState, useEffect } from "react";
import { Bell, BellOff, X, Settings } from "lucide-react";
import { useWebPush } from "@/hooks/use-web-push";

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

type PermState = "default" | "granted" | "denied" | "unsupported";

function getPermState(): PermState {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window))
    return "unsupported";
  return Notification.permission as PermState;
}

export function NotificationNudgeBanner() {
  const [permState, setPermState] = useState<PermState>(() => getPermState());
  const [dismissed, setDismissed] = useState<boolean>(() => isDismissed());
  const { enable, status } = useWebPush();
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    setPermState(getPermState());
    setDismissed(isDismissed());
  }, []);

  useEffect(() => {
    if (status === "granted") setPermState("granted");
    if (status === "denied") setPermState("denied");
  }, [status]);

  const handleAllow = async () => {
    setEnabling(true);
    await enable();
    setPermState(getPermState());
    setEnabling(false);
  };

  const handleDismiss = () => {
    snooze();
    setDismissed(true);
  };

  if (permState === "unsupported" || permState === "granted" || dismissed) return null;

  if (permState === "denied") {
    return (
      <div
        className="relative flex items-start gap-3 rounded-2xl px-4 py-3 text-sm"
        style={{
          background: "linear-gradient(135deg,#FEF2F2,#FFF7ED)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <div
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <BellOff className="w-4 h-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-red-700 leading-snug">
            Notifications are blocked
          </p>
          <p className="text-red-500 text-xs mt-0.5 leading-relaxed">
            Browser ne notification block kar diya hai. Enable karne ke liye browser ke{" "}
            <strong>Settings → Site Settings → Notifications</strong> mein jao aur KidSchedule ko Allow karo.
          </p>
          <button
            onClick={() => window.open("app-settings:", "_blank")}
            className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-red-600 underline-offset-2 underline"
          >
            <Settings className="w-3 h-3" />
            Open settings
          </button>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-full hover:bg-red-100 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-red-400" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative flex items-center gap-3 rounded-2xl px-4 py-3"
      style={{
        background: "linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 60%,#FDF2F8 100%)",
        border: "1px solid rgba(99,102,241,0.2)",
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
          Amy aapko bedtime, meals aur routines ka time pe yaad dilayegi.
        </p>
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <button
          onClick={handleAllow}
          disabled={enabling}
          className="px-3 py-1.5 rounded-xl text-white text-xs font-bold transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg,#6366F1,#A855F7)",
            boxShadow: "0 3px 10px rgba(99,102,241,0.35)",
            opacity: enabling ? 0.7 : 1,
          }}
        >
          {enabling ? "Wait…" : "Allow"}
        </button>
        <button
          onClick={handleDismiss}
          className="text-[11px] font-medium text-indigo-400 hover:text-indigo-600 transition-colors"
        >
          Later
        </button>
      </div>

      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-0.5 rounded-full hover:bg-indigo-100 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3 h-3 text-indigo-300" />
      </button>
    </div>
  );
}
