/**
 * Phonics playback analytics — lightweight in-memory counters.
 *
 * Tracks the metrics that matter for tap-to-hear quality: start latency, overlap
 * prevention (rapid-tap interruptions), fallback usage, failures, and zombie
 * cleanups. Pure counters + structured diagnostics — no playback control here.
 */

import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";

export type PhonicsPlaybackMetrics = {
  /** Clips that began playing. */
  playStarts: number;
  /** A new tap stopped a still-playing clip (overlap prevented / rapid tap). */
  interruptions: number;
  /** Duplicate same-clip taps collapsed by the debounce. */
  debounceSkips: number;
  /** Static MP3 missed → speech-synthesis / tone fallback used. */
  fallbacks: number;
  /** Clips that failed to start or play. */
  failures: number;
  /** Plays blocked awaiting a user gesture (autoplay policy). */
  gestureBlocked: number;
  /** Clips that neither ended nor errored and were force-cleaned (zombie). */
  zombieCleanups: number;
  /** Sum of start latency samples (ms). */
  startLatencyTotalMs: number;
  /** Count of start latency samples. */
  startLatencySamples: number;
  /** Worst observed start latency (ms). */
  startLatencyMaxMs: number;
};

const metrics: PhonicsPlaybackMetrics = {
  playStarts: 0,
  interruptions: 0,
  debounceSkips: 0,
  fallbacks: 0,
  failures: 0,
  gestureBlocked: 0,
  zombieCleanups: 0,
  startLatencyTotalMs: 0,
  startLatencySamples: 0,
  startLatencyMaxMs: 0,
};

export function recordPhonicsPlayStart(label: string): void {
  metrics.playStarts += 1;
  logAmyVoiceDiag("phonics_metric_play_start", { label, total: metrics.playStarts });
}

export function recordPhonicsInterruption(label: string): void {
  metrics.interruptions += 1;
  logAmyVoiceDiag("phonics_metric_interruption", { label, total: metrics.interruptions });
}

export function recordPhonicsDebounceSkip(label: string): void {
  metrics.debounceSkips += 1;
  logAmyVoiceDiag("phonics_metric_debounce_skip", { label, total: metrics.debounceSkips });
}

export function recordPhonicsFallback(layer: string): void {
  metrics.fallbacks += 1;
  logAmyVoiceDiag("phonics_metric_fallback", { layer, total: metrics.fallbacks });
}

export function recordPhonicsFailure(reason: string): void {
  metrics.failures += 1;
  logAmyVoiceDiag("phonics_metric_failure", { reason, total: metrics.failures });
}

export function recordPhonicsGestureBlocked(label: string): void {
  metrics.gestureBlocked += 1;
  logAmyVoiceDiag("phonics_metric_gesture_blocked", { label, total: metrics.gestureBlocked });
}

export function recordPhonicsZombieCleanup(label: string): void {
  metrics.zombieCleanups += 1;
  logAmyVoiceDiag("phonics_metric_zombie_cleanup", { label, total: metrics.zombieCleanups });
}

export function recordPhonicsStartLatency(ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  metrics.startLatencyTotalMs += ms;
  metrics.startLatencySamples += 1;
  if (ms > metrics.startLatencyMaxMs) metrics.startLatencyMaxMs = ms;
  logAmyVoiceDiag("phonics_metric_start_latency", {
    ms: Math.round(ms),
    avg: Math.round(metrics.startLatencyTotalMs / metrics.startLatencySamples),
    max: Math.round(metrics.startLatencyMaxMs),
  });
}

export function getPhonicsPlaybackMetrics(): PhonicsPlaybackMetrics & {
  averageStartLatencyMs: number;
} {
  return {
    ...metrics,
    averageStartLatencyMs:
      metrics.startLatencySamples > 0
        ? Math.round(metrics.startLatencyTotalMs / metrics.startLatencySamples)
        : 0,
  };
}

export function resetPhonicsPlaybackMetrics(): void {
  metrics.playStarts = 0;
  metrics.interruptions = 0;
  metrics.debounceSkips = 0;
  metrics.fallbacks = 0;
  metrics.failures = 0;
  metrics.gestureBlocked = 0;
  metrics.zombieCleanups = 0;
  metrics.startLatencyTotalMs = 0;
  metrics.startLatencySamples = 0;
  metrics.startLatencyMaxMs = 0;
}
