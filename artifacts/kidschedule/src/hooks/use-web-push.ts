import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuthFetch } from "./use-auth-fetch";
import { useToast } from "./use-toast";

export type WebPushStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "error";

function getInitialStatus(): WebPushStatus {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator))
    return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "idle";
}

export function useWebPush() {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [status, setStatus] = useState<WebPushStatus>(getInitialStatus);

  // Keep status in sync if the user changes browser permission externally.
  useEffect(() => {
    if (!("Notification" in window)) return;
    setStatus(getInitialStatus());
  }, []);

  const enable = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      setStatus("unsupported");
      return;
    }

    setStatus("requesting");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        toast({
          title: t("toasts.use_web_push.blocked_title"),
          description: t("toasts.use_web_push.blocked_body"),
          variant: "destructive",
        });
        return;
      }

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
      if (!vapidKey) {
        throw new Error("VITE_FIREBASE_VAPID_KEY is not configured.");
      }

      const { getWebPushToken } = await import("@/lib/firebase");
      const token = await getWebPushToken(vapidKey);

      const r = await authFetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          platform: "web",
          deviceName: navigator.userAgent.slice(0, 100),
        }),
      });
      if (!r.ok) throw new Error("Failed to register token with server");

      setStatus("granted");
      toast({ title: t("toasts.use_web_push.enabled") });
    } catch (err) {
      console.error("[useWebPush] enable failed:", err);
      setStatus("error");
      toast({
        title: t("toasts.use_web_push.enable_failed_title"),
        description:
          err instanceof Error ? err.message : t("toasts.use_web_push.enable_failed_body_default"),
        variant: "destructive",
      });
    }
  }, [authFetch, toast, t]);

  const disable = useCallback(async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        if (reg.active?.scriptURL.includes("firebase-messaging-sw")) {
          await reg.unregister();
        }
      }
    } catch {
    }
    setStatus("idle");
    toast({ title: t("toasts.use_web_push.disabled") });
  }, [toast, t]);

  return { status, enable, disable };
}
