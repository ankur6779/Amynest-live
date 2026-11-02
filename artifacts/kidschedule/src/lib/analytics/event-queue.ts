import { getApiUrl } from "@/lib/api";
import { applyDeviceHeaders } from "@/lib/device-id";
import { ANALYTICS_MAX_BATCH } from "@workspace/analytics-taxonomy";
import {
  CRITICAL_ANALYTICS_EVENTS,
  FLUSH_DEBOUNCE_MS,
  HARD_QUEUE_CAP,
  MAX_BACKOFF_MS,
  MAX_PERSISTENT_EVENTS,
  type AuthFetchFn,
  type QueuedAnalyticsEvent,
} from "./constants";
import {
  loadPersistentQueue,
  savePersistentQueue,
} from "./session-manager";
import type { AnalyticsRuntimeContext } from "./context";

export type FlushResult = {
  sent: number;
  failed: number;
  requeued: number;
};

type BatchAck = {
  ok: boolean;
  /** Null means the server acknowledged the whole batch (legacy 202 with no id lists). */
  acknowledgedIds: Set<string> | null;
};

function boundQueue(events: QueuedAnalyticsEvent[]): QueuedAnalyticsEvent[] {
  if (events.length <= MAX_PERSISTENT_EVENTS) return events;
  const drop = new Set<number>();
  let dropNormal = events.length - MAX_PERSISTENT_EVENTS;
  for (let i = 0; i < events.length && dropNormal > 0; i += 1) {
    if (!CRITICAL_ANALYTICS_EVENTS.has(events[i].name)) {
      drop.add(i);
      dropNormal -= 1;
    }
  }
  const kept = events.filter((_, index) => !drop.has(index));
  if (kept.length <= HARD_QUEUE_CAP) return kept;
  return kept.slice(kept.length - HARD_QUEUE_CAP);
}

async function postAnalyticsBatch(
  endpoint: string,
  batch: QueuedAnalyticsEvent[],
  ctx: AnalyticsRuntimeContext,
  fetcher: (url: string, init: RequestInit) => Promise<Response>,
): Promise<BatchAck> {
  const body = JSON.stringify({
    events: batch,
    platform: ctx.platform,
    appVersion: ctx.appVersion,
    buildNumber: ctx.buildNumber,
    environment: ctx.environment,
  });

  const headers = new Headers({ "Content-Type": "application/json" });
  applyDeviceHeaders(headers);

  const res = await fetcher(getApiUrl(endpoint), {
    method: "POST",
    headers,
    body,
  });
  if (!(res.ok || res.status === 202)) return { ok: false, acknowledgedIds: null };
  type AckBody = {
    acceptedEventIds?: string[];
    duplicateEventIds?: string[];
    droppedEventIds?: string[];
  };
  let parsed: AckBody | null = null;
  try {
    parsed = (await res.json()) as AckBody;
  } catch {
    parsed = null;
  }
  const listed = parsed
    && (Array.isArray(parsed.acceptedEventIds)
      || Array.isArray(parsed.duplicateEventIds)
      || Array.isArray(parsed.droppedEventIds));
  if (!listed || !parsed) return { ok: true, acknowledgedIds: null };
  return {
    ok: true,
    acknowledgedIds: new Set([
      ...(parsed.acceptedEventIds ?? []),
      ...(parsed.duplicateEventIds ?? []),
      ...(parsed.droppedEventIds ?? []),
    ]),
  };
}

function preauthFetcher(): (url: string, init: RequestInit) => Promise<Response> {
  return (url, init) => fetch(url, init);
}

export class AnalyticsEventQueue {
  private memory: QueuedAnalyticsEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 0;
  private lastAuthFetch: AuthFetchFn | null = null;
  private flushing = false;

  constructor(
    private readonly getContext: () => AnalyticsRuntimeContext,
  ) {
    this.memory = loadPersistentQueue();
  }

  enqueue(event: QueuedAnalyticsEvent): void {
    this.memory = boundQueue([...this.memory, event]);
    savePersistentQueue(this.memory);
    this.scheduleFlush();
  }

  setAuthFetch(fetcher: AuthFetchFn | null): void {
    this.lastAuthFetch = fetcher;
  }

  scheduleFlush(delayMs = FLUSH_DEBOUNCE_MS): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, delayMs);
  }

  async flush(authFetch?: AuthFetchFn): Promise<FlushResult> {
    if (authFetch) this.lastAuthFetch = authFetch;
    if (this.memory.length === 0 || this.flushing) {
      return { sent: 0, failed: 0, requeued: this.memory.length };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { sent: 0, failed: 0, requeued: this.memory.length };
    }

    this.flushing = true;
    let sent = 0;
    let failed = 0;
    let needsRetry = false;
    const ctx = this.getContext();

    try {
      while (this.memory.length > 0) {
        const batch = this.memory.slice(0, ANALYTICS_MAX_BATCH);
        const authFetcher = this.lastAuthFetch;
        let ack: BatchAck = { ok: false, acknowledgedIds: null };

        if (authFetcher) {
          try {
            ack = await postAnalyticsBatch(
              "/api/analytics/events",
              batch,
              ctx,
              authFetcher,
            );
          } catch {
            ack = { ok: false, acknowledgedIds: null };
          }
        }

        if (!ack.ok) {
          try {
            ack = await postAnalyticsBatch(
              "/api/analytics/preauth-events",
              batch,
              ctx,
              preauthFetcher(),
            );
          } catch {
            ack = { ok: false, acknowledgedIds: null };
          }
        }

        if (!ack.ok) {
          failed += batch.length;
          needsRetry = true;
          break;
        }

        const retry = ack.acknowledgedIds
          ? batch.filter((event) => event.eventId && !ack.acknowledgedIds?.has(event.eventId))
          : [];
        this.memory.splice(0, batch.length);
        if (retry.length > 0) {
          this.memory = [...retry, ...this.memory];
          failed += retry.length;
          needsRetry = true;
          break;
        }
        sent += batch.length - retry.length;
        this.backoffMs = 0;
      }
    } finally {
      this.flushing = false;
    }

    if (needsRetry) {
      this.memory = boundQueue(this.memory);
      this.backoffMs = Math.min(
        this.backoffMs === 0 ? 1000 : this.backoffMs * 2,
        MAX_BACKOFF_MS,
      );
      this.scheduleFlush(this.backoffMs);
    }

    savePersistentQueue(this.memory);
    return { sent, failed, requeued: this.memory.length };
  }

  pendingCount(): number {
    return this.memory.length;
  }

  hasEvent(name: string): boolean {
    return this.memory.some((event) => event.name === name);
  }
}
