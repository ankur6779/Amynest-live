import { getApiUrl } from "@/lib/api";
import {
  ANALYTICS_MAX_BATCH,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "@workspace/analytics-taxonomy";

/**
 * Product analytics client. Typed, batched, best-effort. Event names and
 * prop shapes come from @workspace/analytics-taxonomy (the same definitions
 * the server validates against), so client and server can't drift.
 *
 * Pure measurement — analytics never influences routine generation.
 */

type QueuedEvent = {
  name: AnalyticsEventName;
  props: Record<string, unknown>;
  sessionId: string;
  clientTs: string;
};

const SESSION_KEY = "amynest_analytics_session";
const APP_OPEN_KEY = "amynest_analytics_app_open_sent";
const FLUSH_DEBOUNCE_MS = 2000;

let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pending: QueuedEvent[] = [];

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "web";
  const ua = navigator.userAgent || "";
  if (/AmyNestAndroid/i.test(ua)) return "android";
  if (typeof window !== "undefined") {
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    if (cap?.isNativePlatform?.()) return "ios";
  }
  return "web";
}

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "no-session";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Record a product analytics event. Type-safe: `name` must be a taxonomy
 * event and `props` must match its schema.
 */
export function track<E extends AnalyticsEventName>(
  name: E,
  props: AnalyticsEventProps<E>,
): void {
  pending.push({
    name,
    props: (props ?? {}) as Record<string, unknown>,
    sessionId: getSessionId(),
    clientTs: new Date().toISOString(),
  });
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    // Best-effort: a flush without authFetch is a no-op until the telemetry
    // bootstrap drives flushAnalytics() with credentials.
    void flushAnalytics();
  }, FLUSH_DEBOUNCE_MS);
}

let lastAuthFetch:
  | ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>)
  | null = null;

/**
 * Flush queued events to the server. The telemetry bootstrap passes an
 * authenticated fetch; once provided it is retained so debounced flushes can
 * proceed without re-plumbing credentials.
 */
export async function flushAnalytics(
  authFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): Promise<void> {
  if (authFetch) lastAuthFetch = authFetch;
  const fetcher = lastAuthFetch;
  if (!fetcher || pending.length === 0) return;

  const batch = pending.splice(0, ANALYTICS_MAX_BATCH);
  try {
    await fetcher(getApiUrl("/api/analytics/events"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch, platform: detectPlatform() }),
    });
  } catch {
    // Best-effort telemetry — drop on failure rather than blocking the app.
  }
}

/**
 * Emit app_open + session_start once per browser session. Safe to call on
 * every boot; guarded by a sessionStorage flag.
 */
export function trackAppOpen(): void {
  if (typeof sessionStorage !== "undefined") {
    if (sessionStorage.getItem(APP_OPEN_KEY)) return;
    sessionStorage.setItem(APP_OPEN_KEY, "1");
  }
  track("app_open", {});
  track("session_start", {});
}
