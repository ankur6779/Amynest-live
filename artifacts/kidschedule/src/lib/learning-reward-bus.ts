/**
 * Phase 6 — global reward event bus.
 *
 * One place where reward events fan out, so the learning sync engine and the
 * UI celebration layer don't need to know about each other. The bus is a tiny
 * pub/sub — it does NOT hold persistent reward state.
 */

import type { RewardEvent } from "@workspace/learning-progress-engine";

type Listener = (events: RewardEvent[]) => void;

const listeners = new Set<Listener>();

export function publishRewardEvents(events: RewardEvent[]): void {
  if (events.length === 0) return;
  for (const l of listeners) {
    try {
      l(events);
    } catch {
      /* listeners must not break each other */
    }
  }
}

export function subscribeRewardEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
