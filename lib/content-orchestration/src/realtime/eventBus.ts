import type { RealtimeEvent, RealtimeEventType } from "./types.js";

export type EventBusListener = (event: RealtimeEvent) => void;

/**
 * In-process event bus for realtime learning signals.
 * Client interactions emit here; streamProcessor and decision engine subscribe.
 */
export class RealtimeEventBus {
  private listeners = new Set<EventBusListener>();
  private history = new Map<string, RealtimeEvent[]>();
  private readonly maxHistoryPerChild: number;

  constructor(maxHistoryPerChild = 50) {
    this.maxHistoryPerChild = maxHistoryPerChild;
  }

  subscribe(listener: EventBusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: RealtimeEvent): void {
    const list = this.history.get(event.childId) ?? [];
    list.push(event);
    if (list.length > this.maxHistoryPerChild) {
      list.splice(0, list.length - this.maxHistoryPerChild);
    }
    this.history.set(event.childId, list);

    for (const listener of this.listeners) {
      listener(event);
    }
  }

  getRecentEvents(childId: string, limit = 20): RealtimeEvent[] {
    const list = this.history.get(childId) ?? [];
    return list.slice(-limit);
  }

  countRecentByType(
    childId: string,
    type: RealtimeEventType,
    sinceMs: number,
    now = Date.now(),
  ): number {
    return this.getRecentEvents(childId).filter(
      (e) => e.type === type && e.timestamp >= now - sinceMs,
    ).length;
  }

  clearChild(childId: string): void {
    this.history.delete(childId);
  }
}

/** Singleton bus for server process (api-server attaches one instance). */
let globalBus: RealtimeEventBus | null = null;

export function getGlobalEventBus(): RealtimeEventBus {
  if (!globalBus) globalBus = new RealtimeEventBus();
  return globalBus;
}

export function resetGlobalEventBus(): void {
  globalBus = null;
}
