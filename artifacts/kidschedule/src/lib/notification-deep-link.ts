/**
 * notification-deep-link.ts — routes notification taps through @workspace/action-routing.
 */
import { resolveDeepLinkPath as resolveActionRoute } from "@workspace/action-routing";
import { hasNotificationTapPayload } from "@/lib/notification-navigation-guard";

export function resolveDeepLinkPath(
  rawPath: string | null | undefined,
  category?: string | null,
  data?: Record<string, unknown>,
): string {
  return resolveActionRoute(rawPath, category, data).path;
}

export function parseNotifTapPayload(payload: unknown): {
  deepLink: string;
  category?: string;
  actionTarget?: string;
  entityId?: string;
  data: Record<string, string>;
} {
  const root = payload as {
    notification?: { data?: Record<string, unknown> };
    data?: Record<string, unknown>;
  } | null;
  const raw = root?.notification?.data ?? root?.data ?? {};
  const data: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v !== "object") data[k] = String(v);
  }
  const deepLink = String(raw.deepLink ?? raw.url ?? raw.deep_link ?? "").trim();
  const category =
    typeof raw.category === "string" && raw.category.trim()
      ? raw.category.trim()
      : undefined;
  const actionTarget =
    typeof raw.actionTarget === "string" ? raw.actionTarget : undefined;
  const entityId = raw.entityId != null ? String(raw.entityId) : undefined;
  return { deepLink, category, actionTarget, entityId, data };
}

interface NotifTap {
  deepLink: string;
  category?: string;
  actionTarget?: string;
  entityId?: string;
  userInteraction?: boolean;
  notificationId?: string;
  tappedAt?: number;
  source?: string;
  usedFallback?: boolean;
  data?: Record<string, string>;
}

let _pending: NotifTap | null = null;

export function drainPendingNotifTap(): NotifTap | null {
  const t = _pending;
  _pending = null;
  return t;
}

export interface NotifDeepLinkMeta {
  userInteraction?: boolean;
  notificationId?: string | null;
  tappedAt?: number;
  source?: "android-tap" | "capacitor-tap" | "pending-buffer" | "pwa-sw";
  data?: Record<string, string>;
}

export function dispatchNotifDeepLink(
  rawPath: string,
  category?: string | null,
  meta?: NotifDeepLinkMeta,
): void {
  if (!hasNotificationTapPayload(rawPath, category)) {
    return;
  }

  const parsed = meta?.data ?? {};
  const resolved = resolveActionRoute(rawPath, category, parsed);
  const deepLink = resolved.path;

  const detail = {
    deepLink,
    category: category ?? undefined,
    actionTarget: resolved.actionTarget,
    entityId: resolved.entityId != null ? String(resolved.entityId) : undefined,
    usedFallback: resolved.usedFallback,
    userInteraction: meta?.userInteraction === true,
    notificationId: meta?.notificationId ?? undefined,
    tappedAt: meta?.tappedAt ?? Date.now(),
    source: meta?.source,
    data: parsed,
  };

  _pending = { ...detail };
  try {
    window.dispatchEvent(
      new CustomEvent("amynest-notif-deeplink", { detail }),
    );
  } catch {
    /* ignore */
  }
}

declare global {
  interface Window {
    onNotificationTap?: (deepLink: string, category?: string) => void;
  }
}

if (typeof window !== "undefined") {
  window.onNotificationTap = (deepLink: string, category?: string) => {
    dispatchNotifDeepLink(deepLink, category, {
      userInteraction: true,
      tappedAt: Date.now(),
      source: "android-tap",
    });
  };

  window.addEventListener("message", (event) => {
    const msg = event.data as { type?: string; deepLink?: string; category?: string; data?: Record<string, string> } | null;
    if (msg?.type !== "amynest-notif-deeplink") return;
    dispatchNotifDeepLink(msg.deepLink ?? "", msg.category, {
      userInteraction: true,
      tappedAt: Date.now(),
      source: "pwa-sw",
      data: msg.data,
    });
  });
}
