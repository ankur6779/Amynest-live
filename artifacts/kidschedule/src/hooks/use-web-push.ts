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

function isSupportedBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function getPermissionStatus(): WebPushStatus {
  if (!isSupportedBrowser()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return "idle";
}

export function useWebPush() {
  const authFetch = useAuthFetch();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [status, setStatus] = useState<WebPushStatus>(getPermissionStatus);

  useEffect(() => {
    const current = getPermissionStatus();
    setStatus(current);

    if (!isSupportedBrowser()) return;

    // Listen for permission changes in real-time (e.g. user unblocks from OS settings).
    let permStatus: PermissionStatus | null = null;
    const handleChange = () => setStatus(getPermissionStatus());

    navigator.permissions
      .query({ name: "notifications" as PermissionName })
      .then((ps) => {
        permStatus = ps;
        ps.addEventListener("change", handleChange);
      })
      .catch(() => {
        // Permissions API not available on this browser — no live sync,
        // status is still seeded correctly from Notification.permission above.
      });

    return () => {
      permStatus?.removeEventListener("change", handleChange);
    };
  }, []);

  /**
   * Re-registers the FCM token with the server without asking for permission
   * again. Useful when the browser already has permission but the token was
   * never saved (e.g. the server was down during initial enable).
   * Returns true on success, false on failure.
   */
  const refreshRegistration = useCallback(async (): Promise<boolean> => {
    if (!isSupportedBrowser() || Notification.permission !== "granted") {
      return false;
    }
    try {
      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY as string;
      if (!vapidKey) return false;
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
      return r.ok;
    } catch {
      return false;
    }
  }, [authFetch]);

  const enable = useCallback(async () => {
    if (!isSupportedBrowser()) {
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
          err instanceof Error
            ? err.message
            : t("toasts.use_web_push.enable_failed_body_default"),
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
      /* ignore */
    }
    setStatus("idle");
    toast({ title: t("toasts.use_web_push.disabled") });
  }, [toast, t]);

  return { status, enable, disable, refreshRegistration, isSupported: isSupportedBrowser() };
}
