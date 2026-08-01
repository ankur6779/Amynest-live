import { buildLearningEvent } from "./builders.js";
import { createLearningEventId } from "./id.js";
import type {
  LearningEvent,
  LearningEventBusOptions,
  LearningEventHandler,
  LearningEventInput,
  OfflineQueueStorage,
  ReplayOptions,
  SubscribeFilter,
  Subscription,
} from "./types.js";
import { DEFAULT_EVENT_PRIORITY } from "./types.js";

function nowMs(): number {
  return typeof performance !== "undefined" && performance.now
    ? performance.now()
    : Date.now();
}

const DEFAULT_MAX_HISTORY = 500;
const DEFAULT_MAX_OFFLINE = 1000;
const DEFAULT_DEDUPE = 2000;

export type UnsubscribeFn = (() => void) & { id: string };

export type LearningEventBus = {
  publish(input: LearningEventInput): LearningEvent | null;
  batch(inputs: LearningEventInput[]): LearningEvent[];
  subscribe(
    handler: LearningEventHandler,
    filter?: SubscribeFilter,
  ): UnsubscribeFn;
  unsubscribe(subscriptionId: string): boolean;
  replay(options?: ReplayOptions): number;
  /** Drain offline queue when back online. Returns delivered count. */
  flushOffline(): number;
  /** Mark bus online/offline when no isOnline() injector is used. */
  setOnline(online: boolean): void;
  getHistory(limit?: number): LearningEvent[];
  getOfflineQueue(): LearningEvent[];
  /** Test / child-reset helper. */
  clear(options?: { history?: boolean; offline?: boolean; dedupe?: boolean }): void;
};

type InternalSub = Subscription;

function matchesFilter(event: LearningEvent, filter: SubscribeFilter): boolean {
  if (filter.childId && event.payload.childId !== String(filter.childId)) {
    return false;
  }
  if (filter.types?.length && !filter.types.includes(event.type)) {
    return false;
  }
  if (filter.modules?.length && !filter.modules.includes(event.payload.module)) {
    return false;
  }
  return true;
}

function sortSubs(subs: InternalSub[]): InternalSub[] {
  return [...subs].sort((a, b) => b.priority - a.priority);
}

/**
 * Create an in-process learning event bus.
 *
 * Guarantees:
 * - Ordered delivery by monotonic `seq` within a bus instance
 * - Deduplication by event `id`
 * - Offline queue + flush on reconnect (when storage / isOnline provided)
 * - Subscriber priority (higher first)
 * - Handlers cannot break the bus (errors are swallowed)
 */
export function createLearningEventBus(
  options: LearningEventBusOptions = {},
): LearningEventBus {
  const maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;
  const maxOffline = options.maxOfflineQueue ?? DEFAULT_MAX_OFFLINE;
  const dedupeCapacity = options.dedupeCapacity ?? DEFAULT_DEDUPE;
  const now = options.now ?? (() => new Date());
  const createId = options.createId ?? createLearningEventId;
  const storage: OfflineQueueStorage | undefined = options.offlineStorage;
  const onTelemetry = options.onTelemetry;

  const emitTelemetry: NonNullable<LearningEventBusOptions["onTelemetry"]> = (
    event,
  ) => {
    if (!onTelemetry) return;
    try {
      onTelemetry(event);
    } catch {
      /* never break bus */
    }
  };

  let seq = 0;
  let onlineOverride: boolean | null = null;
  /** While flushing, nested publishes are deferred so history stays seq-monotonic. */
  let flushDepth = 0;
  const deferredDuringFlush: LearningEventInput[] = [];
  const history: LearningEvent[] = [];
  let offlineQueue: LearningEvent[] = storage?.load() ?? [];
  const recentIds: string[] = [];
  const recentIdSet = new Set<string>();
  const subscriptions = new Map<string, InternalSub>();

  const isOnline = (): boolean => {
    if (onlineOverride != null) return onlineOverride;
    if (options.isOnline) return options.isOnline();
    return true;
  };

  const rememberId = (id: string): boolean => {
    if (recentIdSet.has(id)) return false;
    recentIdSet.add(id);
    recentIds.push(id);
    while (recentIds.length > dedupeCapacity) {
      const old = recentIds.shift();
      if (old) recentIdSet.delete(old);
    }
    return true;
  };

  const persistOffline = (): void => {
    if (!storage) return;
    try {
      storage.save(offlineQueue);
    } catch {
      /* quota — keep in-memory */
    }
  };

  const enqueueOffline = (event: LearningEvent): void => {
    offlineQueue.push(event);
    if (offlineQueue.length > maxOffline) {
      offlineQueue.sort((a, b) => a.priority - b.priority);
      offlineQueue = offlineQueue.slice(offlineQueue.length - maxOffline);
      offlineQueue.sort((a, b) => a.seq - b.seq);
    }
    persistOffline();
  };

  const deliver = (event: LearningEvent): void => {
    history.push(event);
    if (history.length > maxHistory) {
      history.splice(0, history.length - maxHistory);
    }

    const subs = sortSubs([...subscriptions.values()]);
    for (const sub of subs) {
      if (!matchesFilter(event, sub.filter)) continue;
      try {
        sub.handler(event);
      } catch {
        /* isolate listeners */
      }
    }
  };

  const publishOne = (input: LearningEventInput): LearningEvent | null => {
    // Handlers that publish during flushOffline must not interleave new seqs
    // between older offline events (would break history monotonicity).
    if (flushDepth > 0) {
      deferredDuringFlush.push(input);
      return null;
    }

    // Offline queue can survive reloads. If we boot already-online, hosts may
    // never see an offline→online transition — drain before new online work.
    if (isOnline() && offlineQueue.length > 0) {
      flushOffline();
    }

    const t0 = onTelemetry ? nowMs() : 0;
    seq += 1;
    const event = buildLearningEvent(input, { seq, now, createId });
    if (!rememberId(event.id)) {
      emitTelemetry({ kind: "duplicate", eventType: event.type });
      return null;
    }

    if (!isOnline()) {
      enqueueOffline(event);
      emitTelemetry({
        kind: "publish",
        latencyMs: onTelemetry ? Math.max(0, nowMs() - t0) : 0,
        queued: true,
        queueDepth: offlineQueue.length,
        eventType: event.type,
      });
      return event;
    }

    deliver(event);
    emitTelemetry({
      kind: "publish",
      latencyMs: onTelemetry ? Math.max(0, nowMs() - t0) : 0,
      queued: false,
      queueDepth: offlineQueue.length,
      eventType: event.type,
    });
    return event;
  };

  const drainDeferredPublishes = (): void => {
    while (deferredDuringFlush.length > 0) {
      const next = deferredDuringFlush.shift()!;
      publishOne(next);
    }
  };

  const flushOffline = (): number => {
    if (!isOnline() || offlineQueue.length === 0) return 0;
    // Ordered by seq (publish order), then priority as tie-breaker for same-batch.
    const pending = [...offlineQueue].sort((a, b) => {
      if (a.seq !== b.seq) return a.seq - b.seq;
      return b.priority - a.priority;
    });
    offlineQueue = [];
    persistOffline();

    const t0 = onTelemetry ? nowMs() : 0;
    let delivered = 0;
    flushDepth += 1;
    try {
      for (const event of pending) {
        // Ids were recorded at enqueue time — deliver without re-deduping.
        deliver(event);
        delivered += 1;
      }
    } finally {
      flushDepth -= 1;
    }
    drainDeferredPublishes();
    emitTelemetry({
      kind: "flush",
      durationMs: onTelemetry ? Math.max(0, nowMs() - t0) : 0,
      delivered,
      queueDepth: offlineQueue.length,
    });
    return delivered;
  };

  return {
    publish(input) {
      return publishOne(input);
    },

    batch(inputs) {
      const out: LearningEvent[] = [];
      // Higher priority first within the batch, preserving relative order via stable sort + seq.
      const ordered = inputs
        .map((input, index) => ({ input, index }))
        .sort((a, b) => {
          const pa = a.input.priority ?? DEFAULT_EVENT_PRIORITY;
          const pb = b.input.priority ?? DEFAULT_EVENT_PRIORITY;
          if (pa !== pb) return pb - pa;
          return a.index - b.index;
        });

      for (const { input } of ordered) {
        const event = publishOne(input);
        if (event) out.push(event);
      }
      return out;
    },

    subscribe(handler, filter = {}) {
      const id = createId();
      const sub: InternalSub = {
        id,
        handler,
        filter,
        priority: filter.priority ?? DEFAULT_EVENT_PRIORITY,
      };
      subscriptions.set(id, sub);
      const unsub = (() => {
        subscriptions.delete(id);
      }) as UnsubscribeFn;
      unsub.id = id;
      return unsub;
    },

    unsubscribe(subscriptionId) {
      return subscriptions.delete(subscriptionId);
    },

    replay(options = {}) {
      const limit = options.limit ?? history.length;
      let events = history.filter((e) => {
        if (options.childId && e.payload.childId !== String(options.childId)) {
          return false;
        }
        if (options.types?.length && !options.types.includes(e.type)) {
          return false;
        }
        if (options.since && e.payload.timestamp < options.since) {
          return false;
        }
        return true;
      });
      if (events.length > limit) {
        events = events.slice(events.length - limit);
      }

      let count = 0;
      for (const event of events) {
        const replayed: LearningEvent = options.markReplay
          ? {
              ...event,
              payload: {
                ...event.payload,
                metadata: {
                  ...event.payload.metadata,
                  replayed: true,
                },
              },
            }
          : event;

        const subs = sortSubs([...subscriptions.values()]);
        for (const sub of subs) {
          if (!matchesFilter(replayed, sub.filter)) continue;
          try {
            sub.handler(replayed);
          } catch {
            /* isolate */
          }
        }
        count += 1;
      }
      if (count > 0) emitTelemetry({ kind: "replay", count });
      return count;
    },

    flushOffline,

    setOnline(online) {
      onlineOverride = online;
      emitTelemetry({
        kind: "online",
        online,
        queueDepth: offlineQueue.length,
      });
      if (online) flushOffline();
    },

    getHistory(limit = history.length) {
      return history.slice(Math.max(0, history.length - limit));
    },

    getOfflineQueue() {
      return [...offlineQueue];
    },

    clear(opts = { history: true, offline: true, dedupe: true }) {
      if (opts.history !== false) history.length = 0;
      if (opts.offline !== false) {
        offlineQueue = [];
        persistOffline();
      }
      if (opts.dedupe !== false) {
        recentIds.length = 0;
        recentIdSet.clear();
      }
    },
  };
}

/** Process-wide singleton — host apps may replace via setDefaultLearningEventBus. */
let defaultBus: LearningEventBus | null = null;

export function getDefaultLearningEventBus(): LearningEventBus {
  if (!defaultBus) {
    defaultBus = createLearningEventBus();
  }
  return defaultBus;
}

export function setDefaultLearningEventBus(bus: LearningEventBus | null): void {
  defaultBus = bus;
}

export function resetDefaultLearningEventBus(): void {
  defaultBus = null;
}

/** Convenience — publishes on the default bus. */
export function publishLearningEvent(
  input: LearningEventInput,
): LearningEvent | null {
  return getDefaultLearningEventBus().publish(input);
}

export function subscribeLearningEvents(
  handler: LearningEventHandler,
  filter?: SubscribeFilter,
): () => void {
  return getDefaultLearningEventBus().subscribe(handler, filter);
}
