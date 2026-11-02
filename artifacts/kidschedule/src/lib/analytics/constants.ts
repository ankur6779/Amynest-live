import type { AnalyticsEventName } from "@workspace/analytics-taxonomy";

export const PERSISTENT_QUEUE_KEY = "amynest_analytics_persistent_queue";
export const FLUSH_DEBOUNCE_MS = 2000;
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const MAX_BACKOFF_MS = 60_000;
export const MAX_PERSISTENT_EVENTS = 500;
/** Last-resort cap. Critical conversion events are dropped only past this. */
export const HARD_QUEUE_CAP = 800;
/** Foreground heartbeat. Not a per-second pulse. */
export const HEARTBEAT_INTERVAL_MS = 30_000;

const CRITICAL_EVENT_NAMES = [
  "first_open",
  "install_source",
  "purchase_success",
  "upgrade_completed",
  "checkout_started",
  "subscribe_clicked",
  "subscription_cancelled",
  "onboarding_completed",
  "child_created",
  "pre_signup_signup_completed",
  "pre_signup_signup_started",
] as const;

export const CRITICAL_ANALYTICS_EVENTS = new Set<string>(CRITICAL_EVENT_NAMES);

export type QueuedAnalyticsEvent = {
  name: AnalyticsEventName;
  eventId?: string;
  props: Record<string, unknown>;
  sessionId: string;
  clientTs: string;
};

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
