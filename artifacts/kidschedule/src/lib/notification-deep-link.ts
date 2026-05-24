/**
 * notification-deep-link.ts — Smart deep-link routing for AmyNest notifications.
 *
 * Handles three notification tap scenarios:
 *   1. Android cold start   — deepLink baked into initial URL hash by MainActivity
 *   2. Android warm start   — MainActivity calls window.onNotificationTap()
 *   3. iOS Capacitor tap    — native-push-bridge.ts fires "amynest-notif-deeplink" event
 *
 * The module installs window.onNotificationTap() early (at import time) so it
 * is available when the Android WebView calls it via evaluateJavascript after
 * page load, even if React has not yet mounted.
 */

// ── Category → route mapping ─────────────────────────────────────────────────

const CATEGORY_ROUTES: Record<string, string> = {
  routine:           "/routines",
  routine_item:      "/routines",
  nutrition:         "/nutrition",
  insights:          "/assistant",
  weekly:            "/progress",
  engagement:        "/dashboard",
  good_night:        "/routines",
  parenting_tips:    "/parenting-hub",
  story_time:        "/parenting-hub",
  phonics:           "/speech-coach",
  learning_activity: "/study",
  milestone:         "/progress",
};

/** Legacy / server shorthand paths → real SPA routes. */
const PATH_ALIASES: Record<string, string> = {
  "/hub":         "/dashboard",
  "/routine":     "/routines",
  "/meals":       "/nutrition",
  "/study-zone":  "/study",
  "/assistant":   "/amy-coach",
};

function normalizeDeepLinkInput(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      const url = new URL(trimmed);
      const fromHash = url.hash.startsWith("#/")
        ? url.hash.slice(1)
        : url.hash.startsWith("#")
          ? url.hash.slice(1)
          : "";
      if (fromHash.startsWith("/")) return fromHash;
      if (url.pathname && url.pathname !== "/") return url.pathname;
    } catch {
      /* ignore malformed URLs */
    }
  }
  if (trimmed.startsWith("#/")) return trimmed.slice(1);
  if (trimmed.startsWith("#")) return trimmed.slice(1).startsWith("/") ? trimmed.slice(1) : `/${trimmed.slice(1)}`;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

/**
 * Resolve a final navigation path from the raw deepLink string and optional
 * category hint. Priority:
 *   1. Explicit deepLink path from server (e.g. "/routines/42")
 *   2. Known path alias (e.g. "/hub" → "/dashboard")
 *   3. Category-based fallback (e.g. "phonics" → "/speech-coach")
 *   4. "/dashboard" as the safe fallback
 */
export function resolveDeepLinkPath(
  rawPath: string | null | undefined,
  category?: string | null,
): string {
  const normalized = normalizeDeepLinkInput(rawPath);
  if (normalized.length > 1) {
    return PATH_ALIASES[normalized] ?? normalized;
  }
  if (category) {
    const route = CATEGORY_ROUTES[category.toLowerCase().replace(/-/g, "_")];
    if (route) return route;
  }
  return "/dashboard";
}

/** Parse Capacitor pushNotificationActionPerformed / FCM data payloads. */
export function parseNotifTapPayload(payload: unknown): {
  deepLink: string;
  category?: string;
} {
  const root = payload as {
    notification?: { data?: Record<string, unknown> };
    data?: Record<string, unknown>;
  } | null;
  const data = root?.notification?.data ?? root?.data ?? {};
  const deepLink =
    String(data.deepLink ?? data.url ?? data.deep_link ?? "").trim();
  const categoryRaw = data.category;
  const category =
    typeof categoryRaw === "string" && categoryRaw.trim()
      ? categoryRaw.trim()
      : undefined;
  return { deepLink, category };
}

// ── Pending tap buffer (for cold-start race with React mount) ────────────────

interface NotifTap {
  deepLink: string;
  category?: string;
}

let _pending: NotifTap | null = null;

/** Returns and clears any buffered notification tap that arrived before React mounted. */
export function drainPendingNotifTap(): NotifTap | null {
  const t = _pending;
  _pending = null;
  return t;
}

// ── Event dispatcher ─────────────────────────────────────────────────────────

/**
 * Dispatch the "amynest-notif-deeplink" CustomEvent so any mounted
 * useNotificationDeepLink hook can react immediately.
 */
export function dispatchNotifDeepLink(rawPath: string, category?: string | null): void {
  const deepLink = resolveDeepLinkPath(rawPath, category);
  _pending = { deepLink, category: category ?? undefined };
  try {
    window.dispatchEvent(
      new CustomEvent("amynest-notif-deeplink", {
        detail: { deepLink, category: category ?? undefined },
      }),
    );
  } catch {
    /* ignore */
  }
}

// ── window.onNotificationTap — installed eagerly at module import ─────────────

declare global {
  interface Window {
    /** Called by Android MainActivity via evaluateJavascript when app opens from a notification tap. */
    onNotificationTap?: (deepLink: string, category?: string) => void;
  }
}

if (typeof window !== "undefined") {
  window.onNotificationTap = (deepLink: string, category?: string) => {
    dispatchNotifDeepLink(deepLink, category);
  };
}
