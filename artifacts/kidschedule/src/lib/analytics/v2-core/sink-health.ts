/**
 * Developer sink health — debug only.
 * No production UI. Counters are zeroed / hidden when debug is off.
 */

import { isV2AnalyticsDebugEnabled } from "./debug";

export type V2SinkHealthCounters = {
  accepted: number;
  dropped: number;
  rejected: number;
  duplicate: number;
};

const empty = (): V2SinkHealthCounters => ({
  accepted: 0,
  dropped: 0,
  rejected: 0,
  duplicate: 0,
});

let counters: V2SinkHealthCounters = empty();

export type V2SinkHealthKind = keyof V2SinkHealthCounters;

/** Increment a health counter only when analytics debug is enabled. */
export function recordV2SinkHealth(kind: V2SinkHealthKind): void {
  if (!isV2AnalyticsDebugEnabled()) return;
  counters[kind] += 1;
}

/**
 * Snapshot of sink health. Returns null when debug is disabled (prod / off).
 */
export function getV2SinkHealth(): V2SinkHealthCounters | null {
  if (!isV2AnalyticsDebugEnabled()) return null;
  return { ...counters };
}

export function resetV2SinkHealthForTests(): void {
  counters = empty();
}
