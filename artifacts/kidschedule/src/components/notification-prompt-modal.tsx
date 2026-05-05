import { useState, useEffect } from "react";
import { Bell, BellRing, X } from "lucide-react";
import { useAuth } from "@/lib/firebase-auth-hooks";
import { useAuthFetch } from "@/hooks/use-auth-fetch";
import { getApiUrl } from "@/lib/api";
import { getNativePushBridge, requestNativePushPermission, registerNativePushToken } from "@/lib/native-push-bridge";

const MODAL_SNOOZE_KEY = "notify_modal_snoozed_until";
const MODAL_SHOWN_KEY = "notify_modal_shown_once";
const SNOOZE_DAYS = 3;

function isSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(MODAL_SNOOZE_KEY);
    if (!raw) return false;
    return Date.now() < parseInt(raw, 10);
  } catch {
    return false;
  }
}

function snooze() {
  try {
    localStorage.setItem(MODAL_SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 86400_000));
  } catch {}
}

function markShown() {
  try {
    localStorage.setItem(MODAL_SHOWN_KEY, "1");
  } catch {}
}

function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (isSnoozed()) return false;
  if (!("Notification" in window) && !getNativePushBridge()) return false;
  const native = getNativePushBridge();
  if (native) return native.getPermissionStatus() === "default";
  return Notification.permission === "default";
}

export function NotificationPromptModal() {
  const { isSignedIn } = useAuth();
  const authFetch = useAuthFetch();
  const [open, setOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState<"ask" | "enabling">("ask");

  useEffect(() => {
    if (!isSignedIn) return;
    if (!shouldShow()) return;
    const timer = setTimeout(() => {
      if (shouldShow()) setOpen(true);
    }, 1800);
    return () => clearTimeout(timer);
  }, [isSignedIn]);

  if (!open) return null;

  const handleEnable = async () => {
    setWorking(true);
    setStep("enabling");
    markShown();
    try {
      const native = getNativePushBridge();
      if (native) {
        const perm = await requestNativePushPermission(native);
        if (perm === "granted") {
          await registerNativePushToken(authFetch, getApiUrl("/api/push/register"));
        }
        setOpen(false);
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        try {
          const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
          if (vapidKey) {
            const { getWebPushToken } = await import("@/lib/firebase");
            const token = await getWebPushToken(vapidKey);
            if (token) {
              await authFetch(getApiUrl("/api/push/register"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  token,
                  platform: "web",
                  deviceName: navigator.userAgent.slice(0, 100),
                }),
              });
            }
          }
        } catch {
          // FCM registration failure — OS permission is still granted, that's the main goal
        }
      }
    } catch {
      // ignore
    }
    setOpen(false);
    setWorking(false);
  };

  const handleLater = () => {
    snooze();
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleLater}
      />
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: "linear-gradient(160deg, #1a1040 0%, #0f0a2e 60%, #1a1040 100%)", // audit-ok: brand dark bg gradient matching onboarding/notification dark surface
          border: "1px solid rgba(139,92,246,0.3)",
        }}
      >
        <button
          onClick={handleLater}
          className="absolute top-4 right-4 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Close" // i18n-ok: generic icon-only close button aria-label
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-8 pb-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-purple-500)))",
              boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
            }}
          >
            {step === "enabling" ? (
              <BellRing className="w-8 h-8 text-white animate-bounce" />
            ) : (
              <Bell className="w-8 h-8 text-white" />
            )}
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Notifications enable karo
          </h2>
          <p className="text-sm text-white/60 leading-relaxed mb-6">
            Routine reminders, bedtime alerts aur Amy ke insights kabhi miss mat karo.
            Notifications band rehne se aapke bachche ke routine updates miss ho sakte hain.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleEnable}
              disabled={working}
              className="w-full py-3.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, hsl(var(--brand-indigo-500)), hsl(var(--brand-purple-500)))",
                boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }}
            >
              {working ? "Enable ho raha hai…" : "Enable Notifications"}
            </button>

            <button
              onClick={handleLater}
              disabled={working}
              className="w-full py-3 rounded-2xl text-white/50 text-sm font-medium hover:text-white/70 transition-colors"
            >
              Abhi nahi ({SNOOZE_DAYS} din baad remind karo)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
