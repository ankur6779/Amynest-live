/**
 * Debug mode — in-memory inspection during development only.
 * Disabled in production builds (import.meta.env.PROD).
 * Not a production sink; not Firebase.
 */

import type { V2AnalyticsRecord, V2TrackResult } from "./types";

export type V2AnalyticsDebugEntry = {
  at: string;
  record?: V2AnalyticsRecord;
  result: V2TrackResult;
};

function isProdBuild(): boolean {
  try {
    return Boolean(import.meta.env?.PROD);
  } catch {
    return false;
  }
}

let debugEnabledOverride: boolean | null = null;
const buffer: V2AnalyticsDebugEntry[] = [];
const MAX = 200;

/** Explicit override for tests; production always forced off. */
export function setV2AnalyticsDebugEnabled(enabled: boolean): void {
  debugEnabledOverride = enabled;
}

export function isV2AnalyticsDebugEnabled(): boolean {
  if (isProdBuild()) return false;
  if (debugEnabledOverride != null) return debugEnabledOverride;
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

export function recordV2AnalyticsDebug(entry: V2AnalyticsDebugEntry): void {
  if (!isV2AnalyticsDebugEnabled()) return;
  buffer.push(entry);
  if (buffer.length > MAX) buffer.splice(0, buffer.length - MAX);
}

export function getV2AnalyticsDebugBuffer(): readonly V2AnalyticsDebugEntry[] {
  if (!isV2AnalyticsDebugEnabled()) return [];
  return buffer;
}

export function clearV2AnalyticsDebugBuffer(): void {
  buffer.length = 0;
}

export function resetV2AnalyticsDebugForTests(): void {
  debugEnabledOverride = null;
  buffer.length = 0;
}
