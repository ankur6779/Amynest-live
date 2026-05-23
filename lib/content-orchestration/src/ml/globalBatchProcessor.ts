import {
  getGlobalGraph,
  ingestEventsIntoActiveGraph,
  persistGlobalGraph,
  setGlobalGraph,
} from "./globalGraphEngine.js";
import { detectCommunityPatterns } from "./communityPatterns.js";
import type { AnonymousAggregateEvent } from "./types-global.js";

const pendingEvents: AnonymousAggregateEvent[] = [];
let lastBatchAt = 0;
const BATCH_INTERVAL_MS = 60 * 60 * 1000;

export function queueAnonymousAggregate(event: AnonymousAggregateEvent): void {
  pendingEvents.push(event);
}

export function getPendingAggregateCount(): number {
  return pendingEvents.length;
}

/**
 * Hourly/daily batch — merges anonymous aggregates into global graph.
 */
export async function runGlobalGraphBatch(force = false): Promise<{
  processed: number;
  graphVersion: number;
}> {
  const now = Date.now();
  if (!force && pendingEvents.length === 0) {
    return { processed: 0, graphVersion: getGlobalGraph().version };
  }
  if (!force && now - lastBatchAt < BATCH_INTERVAL_MS && pendingEvents.length < 50) {
    return { processed: 0, graphVersion: getGlobalGraph().version };
  }

  const batch = pendingEvents.splice(0, pendingEvents.length);
  const graph = ingestEventsIntoActiveGraph(batch);
  detectCommunityPatterns(graph);
  await persistGlobalGraph(graph);
  lastBatchAt = now;

  return { processed: batch.length, graphVersion: graph.version };
}

export function resetGlobalBatchState(): void {
  pendingEvents.length = 0;
  lastBatchAt = 0;
  setGlobalGraph(getGlobalGraph());
}
