/**
 * Phase 7 — Client telemetry.
 *
 * Lightweight, in-process collector for production telemetry signals:
 * screen load time, dropped frames, animation jank, sync latency, queue
 * retries, offline session count, reward suppression rate, slow renders,
 * abandoned sessions, memory spikes.
 *
 * The engine batches events in memory and flushes them through whatever
 * sink the host configures (`configureTelemetry`). Until a sink is wired,
 * events are silently dropped so this file has zero side-effects.
 *
 * IMPORTANT:
 *  - No PII. Each event is small and structured.
 *  - Never blocks the UI thread — flushing happens on idle / unload.
 *  - Never throws into the calling code.
 */

import { detectPerformanceTier, type PerformanceTier } from "./performance-tier";

export type TelemetryKind =
  | "screen_load"
  | "frame_drop"
  | "animation_jank"
  | "sync_latency"
  | "queue_retry"
  | "offline_session"
  | "reward_suppressed"
  | "slow_render"
  | "memory_spike"
  | "abandoned_session"
  | "api_duration"
  | "experiment_exposure"
  | "feature_flag_evaluated";

export interface TelemetryEvent {
  kind: TelemetryKind;
  at: string;
  /** Numeric measurement (ms, count, bytes…). */
  value?: number;
  /** Optional structured details — no PII. */
  details?: Record<string, string | number | boolean>;
  tier: PerformanceTier;
  /** Stable session id so events can be correlated. */
  sessionId: string;
}

export interface TelemetrySink {
  send: (events: TelemetryEvent[]) => Promise<void> | void;
}

const BATCH_SIZE = 30;
const FLUSH_MS = 8000;
const MAX_BUFFER = 200;

let buffer: TelemetryEvent[] = [];
let sink: TelemetrySink | null = null;
let flushTimer: number | null = null;
let sessionId = "";
let started = false;

function makeSessionId(): string {
  // Short, opaque session id — used only for correlation.
  return `s_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function ensureStarted(): void {
  if (started) return;
  started = true;
  sessionId = makeSessionId();
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flushSync, { passive: true });
    window.addEventListener("pagehide", flushSync, { passive: true });
    document.addEventListener?.("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushSync();
    });
  }
}

function scheduleFlush(delay = FLUSH_MS): void {
  if (typeof window === "undefined") return;
  if (flushTimer != null) return;
  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    void flush();
  }, delay);
}

function flushSync(): void {
  if (buffer.length === 0 || !sink) return;
  const batch = buffer;
  buffer = [];
  try {
    void sink.send(batch);
  } catch {
    /* swallow — telemetry never breaks UI */
  }
}

async function flush(): Promise<void> {
  if (buffer.length === 0 || !sink) return;
  const batch = buffer.slice(0, BATCH_SIZE);
  buffer = buffer.slice(BATCH_SIZE);
  try {
    await sink.send(batch);
  } catch {
    // Re-buffer the failed batch at the front, capped to MAX_BUFFER.
    buffer = [...batch, ...buffer].slice(0, MAX_BUFFER);
    scheduleFlush(FLUSH_MS * 2);
    return;
  }
  if (buffer.length > 0) scheduleFlush(FLUSH_MS);
}

export function configureTelemetry(opts: { sink: TelemetrySink }): void {
  sink = opts.sink;
  ensureStarted();
  if (buffer.length > 0) scheduleFlush(100);
}

export function recordTelemetry(
  kind: TelemetryKind,
  value?: number,
  details?: TelemetryEvent["details"],
): void {
  ensureStarted();
  const evt: TelemetryEvent = {
    kind,
    at: new Date().toISOString(),
    value,
    details,
    tier: detectPerformanceTier().tier,
    sessionId,
  };
  buffer.push(evt);
  if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);
  if (buffer.length >= BATCH_SIZE) {
    scheduleFlush(100);
  } else {
    scheduleFlush();
  }
}

/** Timer helper — returns a stop fn that records `api_duration` on call. */
export function timeApiCall(name: string): () => void {
  const startedAt = performance.now();
  return () => {
    recordTelemetry("api_duration", Math.round(performance.now() - startedAt), {
      name,
    });
  };
}

/** Measure a screen's first meaningful paint. Call once on mount. */
export function recordScreenLoad(screen: string, durationMs: number): void {
  recordTelemetry("screen_load", durationMs, { screen });
}

/** Lightweight in-memory snapshot for the debug page. */
export function getTelemetryBufferForDebug(): TelemetryEvent[] {
  return [...buffer];
}

export function clearTelemetryForTests(): void {
  buffer = [];
  if (flushTimer != null && typeof window !== "undefined") {
    window.clearTimeout(flushTimer);
  }
  flushTimer = null;
  sink = null;
  started = false;
  sessionId = "";
}

export function telemetrySessionId(): string {
  ensureStarted();
  return sessionId;
}
