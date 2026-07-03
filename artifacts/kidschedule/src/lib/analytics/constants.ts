import type { AnalyticsEventName } from "@workspace/analytics-taxonomy";

export const PERSISTENT_QUEUE_KEY = "amynest_analytics_persistent_queue";
export const FLUSH_DEBOUNCE_MS = 2000;
export const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const MAX_BACKOFF_MS = 60_000;
export const MAX_PERSISTENT_EVENTS = 500;

export type QueuedAnalyticsEvent = {
  name: AnalyticsEventName;
  props: Record<string, unknown>;
  sessionId: string;
  clientTs: string;
};

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;
