/**
 * Guards notification-driven navigation so only explicit user taps navigate.
 * Foreground receipts, stale buffers, and empty payloads are ignored.
 */
import { logNavEvent } from "@/lib/navigation-log";
import { normalizeRoutePath } from "@/lib/navigation-stack";
import { resolveDeepLinkPath } from "@/lib/notification-deep-link";

export type NotificationNavSource =
  | "android-tap"
  | "capacitor-tap"
  | "pending-buffer"
  | "custom-event";

export interface NotificationNavRequest {
  deepLink: string;
  category?: string | null;
  /** Must be true for navigation (native tap / action performed). */
  userInteraction?: boolean;
  notificationId?: string | null;
  /** Epoch ms when the tap occurred; defaults to Date.now() at evaluation. */
  tappedAt?: number;
  source?: NotificationNavSource;
}

export interface NotificationNavDecision {
  allow: boolean;
  resolvedPath: string;
  reason?: string;
}

/** Max age for a tap payload to be considered fresh (cold-start buffer). */
export const NOTIFICATION_NAV_MAX_AGE_MS = 120_000;

const consumedNotificationKeys = new Set<string>();
const MAX_CONSUMED_KEYS = 64;

function notificationKey(req: NotificationNavRequest, resolvedPath: string): string {
  const id = req.notificationId?.trim();
  if (id) return `id:${id}`;
  const cat = req.category?.trim() ?? "";
  const dl = req.deepLink?.trim() ?? "";
  return `path:${resolvedPath}|dl:${dl}|cat:${cat}|t:${req.tappedAt ?? 0}`;
}

function pruneConsumedKeys(): void {
  if (consumedNotificationKeys.size <= MAX_CONSUMED_KEYS) return;
  const drop = consumedNotificationKeys.size - MAX_CONSUMED_KEYS;
  let i = 0;
  for (const key of consumedNotificationKeys) {
    consumedNotificationKeys.delete(key);
    i += 1;
    if (i >= drop) break;
  }
}

/** True when intent extras / payload indicate a real notification open. */
export function hasNotificationTapPayload(
  deepLink: string | null | undefined,
  category: string | null | undefined,
): boolean {
  return Boolean(deepLink?.trim() || category?.trim());
}

/**
 * Decide whether a notification tap should cause SPA navigation + toast.
 * Does not mutate consumption state — call {@link consumeNotificationNavigation} after navigate.
 */
export function evaluateNotificationNavigation(
  req: NotificationNavRequest,
): NotificationNavDecision {
  const resolvedPath = normalizeRoutePath(
    resolveDeepLinkPath(req.deepLink, req.category),
  );

  if (req.userInteraction !== true) {
    return {
      allow: false,
      resolvedPath,
      reason: "missing-user-interaction",
    };
  }

  const rawDl = req.deepLink?.trim() ?? "";
  const rawCat = req.category?.trim() ?? "";
  if (!rawDl && !rawCat) {
    return {
      allow: false,
      resolvedPath,
      reason: "empty-payload",
    };
  }

  const tappedAt = req.tappedAt ?? Date.now();
  const age = Date.now() - tappedAt;
  if (age > NOTIFICATION_NAV_MAX_AGE_MS) {
    return {
      allow: false,
      resolvedPath,
      reason: "stale-tap",
    };
  }

  const key = notificationKey(req, resolvedPath);
  if (consumedNotificationKeys.has(key)) {
    return {
      allow: false,
      resolvedPath,
      reason: "duplicate-notification",
    };
  }

  if (typeof window !== "undefined") {
    const current = normalizeRoutePath(window.location.pathname);
    if (current === resolvedPath) {
      return {
        allow: false,
        resolvedPath,
        reason: "already-on-target",
      };
    }
  }

  return { allow: true, resolvedPath };
}

/** Record a consumed tap so retries / duplicate listeners cannot re-navigate. */
export function consumeNotificationNavigation(req: NotificationNavRequest): void {
  const resolvedPath = normalizeRoutePath(
    resolveDeepLinkPath(req.deepLink, req.category),
  );
  const key = notificationKey(req, resolvedPath);
  consumedNotificationKeys.add(key);
  pruneConsumedKeys();
  logNavEvent("notif-nav-consumed", {
    key,
    resolvedPath,
    source: req.source,
  });
}

/** Test-only reset */
export function resetNotificationNavigationGuardForTests(): void {
  consumedNotificationKeys.clear();
}
