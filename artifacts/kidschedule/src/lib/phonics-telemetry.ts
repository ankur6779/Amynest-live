/**
 * Phonics playback analytics — lightweight in-memory counters + production telemetry.
 */

import { logAmyVoiceDiag } from "@/lib/amy-voice-audio-diag";
import { isAndroidInstalledAmyNestApp, isAndroidUa } from "@/lib/device-lite";

export type PhonicsTelemetryEvent =
  | "phonics_manifest_loaded"
  | "phonics_manifest_missing"
  | "phonics_audio_play_success"
  | "phonics_audio_play_failed"
  | "phonics_audio_url_blocked"
  | "phonics_audio_started"
  | "phonics_audio_completed"
  | "phonics_audio_failed"
  | "phonics_audio_manifest_missing"
  | "phonics_word_selected"
  | "phonics_level_changed"
  | "phonics_hear_and_tap_started"
  | "phonics_hear_and_tap_answered"
  | "phonics_hear_and_tap_audio_mismatch"
  | "phonics_circuit_open"
  | "phonics_render_crash"
  | "phonics_blend_step_retry"
  | "phonics_blend_step_failed";

export type PhonicsPlaybackMetrics = {
  playStarts: number;
  interruptions: number;
  debounceSkips: number;
  fallbacks: number;
  failures: number;
  gestureBlocked: number;
  zombieCleanups: number;
  startLatencyTotalMs: number;
  startLatencySamples: number;
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

function getPhonicsDeviceType(): string {
  if (typeof navigator === "undefined") return "unknown";
  try {
    if (isAndroidInstalledAmyNestApp()) return "android_installed";
    if (isAndroidUa()) return "android_browser";
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return "ios";
  } catch {
    /* ignore */
  }
  return "web";
}

/** Structured phonics telemetry — never throws. */
export function recordPhonicsTelemetry(
  event: PhonicsTelemetryEvent,
  detail: Record<string, unknown> = {},
): void {
  try {
    logAmyVoiceDiag(event, {
      deviceType: getPhonicsDeviceType(),
      ...detail,
    });
  } catch {
    /* telemetry must not crash playback */
  }
}

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

export function recordPhonicsPlaySuccess(
  label: string,
  detail: Record<string, unknown> = {},
): void {
  recordPhonicsTelemetry("phonics_audio_play_success", { label, ...detail });
}

export function recordPhonicsPlayFailed(
  label: string,
  reason: string,
  detail: Record<string, unknown> = {},
): void {
  recordPhonicsFailure(reason);
  recordPhonicsTelemetry("phonics_audio_play_failed", { label, reason, ...detail });
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
