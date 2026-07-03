import { getApiUrl } from "@/lib/api";
import { applyDeviceHeaders } from "@/lib/device-id";
import { ANALYTICS_MAX_BATCH } from "@workspace/analytics-taxonomy";
import {
  FLUSH_DEBOUNCE_MS,
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
    this.memory.push(event);
    if (this.memory.length > MAX_PERSISTENT_EVENTS) {
      this.memory = this.memory.slice(-MAX_PERSISTENT_EVENTS);
    }
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
    const fetcher = this.lastAuthFetch;
    if (!fetcher || this.memory.length === 0 || this.flushing) {
      return { sent: 0, failed: 0, requeued: 0 };
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return { sent: 0, failed: 0, requeued: this.memory.length };
    }

    this.flushing = true;
    let sent = 0;
    let failed = 0;
    const failedBatch: QueuedAnalyticsEvent[] = [];

    try {
      while (this.memory.length > 0) {
        const batch = this.memory.splice(0, ANALYTICS_MAX_BATCH);
        const ctx = this.getContext();
        const body = JSON.stringify({
          events: batch,
          platform: ctx.platform,
          appVersion: ctx.appVersion,
          buildNumber: ctx.buildNumber,
          environment: ctx.environment,
        });

        const headers = new Headers({ "Content-Type": "application/json" });
        applyDeviceHeaders(headers);

        try {
          const res = await fetcher(getApiUrl("/api/analytics/events"), {
            method: "POST",
            headers,
            body,
          });
          if (res.ok || res.status === 202) {
            sent += batch.length;
            this.backoffMs = 0;
          } else {
            failed += batch.length;
            failedBatch.push(...batch);
            break;
          }
        } catch {
          failed += batch.length;
          failedBatch.push(...batch);
          break;
        }
      }
    } finally {
      this.flushing = false;
    }

    if (failedBatch.length > 0) {
      this.memory = [...failedBatch, ...this.memory].slice(-MAX_PERSISTENT_EVENTS);
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
}
