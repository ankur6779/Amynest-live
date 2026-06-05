/**
 * Non-blocking audio boot — runs after React mount; failures never block the shell.
 *
 * App Start → Dashboard Render Immediately → Audio Init In Background
 */

import { queueClientLog } from "@/lib/client-logs";
import { trackStartupEvent } from "@/lib/startup-orchestrator";

export type AudioBootMetric =
  | "audioInitStart"
  | "audioInitSuccess"
  | "audioInitFailure"
  | "audioInitDuration";

export type StartupAudioOperationResult<T> = {
  ok: boolean;
  result?: T;
  status?: number;
  timeoutMs: number;
  durationMs: number;
  url: string;
  label: string;
  error?: string;
  stack?: string;
};

const RETRY_DELAYS_MS = [2_000, 5_000, 15_000] as const;
const AUDIO_BOOT_GRACE_MS = 120_000;
const HEALTH_PROBE_TIMEOUT_MS = 12_000;
const STATIC_HEALTH_TIMEOUT_MS = 15_000;

let bootScheduled = false;
let bootAttemptInFlight = false;
let bootSettled = false;
let bootSucceeded = false;
let voiceUnavailable = false;
let retryGeneration = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let bootStartedAt = 0;

const voiceStatusListeners = new Set<(unavailable: boolean) => void>();

function notifyVoiceStatus(): void {
  for (const listener of voiceStatusListeners) listener(voiceUnavailable);
}

export function subscribeVoiceUnavailable(listener: (unavailable: boolean) => void): () => void {
  voiceStatusListeners.add(listener);
  listener(voiceUnavailable);
  return () => voiceStatusListeners.delete(listener);
}

export function isVoiceFeaturesUnavailable(): boolean {
  return voiceUnavailable;
}

export function isAudioBootInProgress(): boolean {
  return bootScheduled && !bootSettled;
}

/** True during boot attempt and grace window — suppress alarming user-facing alerts. */
export function isAudioStartupGraceActive(): boolean {
  if (bootScheduled && !bootSettled) return true;
  if (bootStartedAt <= 0) return false;
  return Date.now() - bootStartedAt < AUDIO_BOOT_GRACE_MS;
}

export function trackAudioBootMetric(
  metric: AudioBootMetric,
  extra?: Record<string, string | number | boolean>,
): void {
  const durationMs =
    metric === "audioInitDuration" && bootStartedAt > 0
      ? Math.round(performance.now() - bootStartedAt)
      : undefined;

  const payload = {
    metric,
    ...(durationMs != null ? { durationMs } : {}),
    voiceUnavailable,
    retryGeneration,
    ...extra,
  };

  console.info(`[AUDIO BOOT] ${metric}`, payload);

  trackStartupEvent("startup_phase_completed", {
    phase: "audio_boot",
    audio_metric: metric,
    ...(durationMs != null ? { audio_init_duration_ms: durationMs } : {}),
    ...extra,
  });

  queueClientLog({
    type: metric === "audioInitFailure" ? "warning" : "info",
    message: metric,
    context: "audio_boot",
    route: typeof window !== "undefined" ? window.location.pathname : undefined,
    meta: payload,
  });
}

function errorDetails(err: unknown): { message: string; stack?: string } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack };
  }
  return { message: String(err ?? "unknown") };
}

/**
 * Run a startup audio network/media operation with structured logging.
 * Never throws — callers use `ok` to decide retry behavior.
 */
export async function runStartupAudioOperation<T>(
  label: string,
  url: string,
  timeoutMs: number,
  fn: () => Promise<T>,
): Promise<StartupAudioOperationResult<T>> {
  const started = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - started);
    const status =
      result && typeof result === "object" && "status" in result
        ? Number((result as { status?: number }).status)
        : undefined;

    console.info("[AUDIO BOOT] operation_ok", {
      label,
      url,
      status,
      timeoutMs,
      durationMs,
    });

    return {
      ok: true,
      result,
      status,
      timeoutMs,
      durationMs,
      url,
      label,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - started);
    const { message, stack } = errorDetails(err);
    const isTimeout =
      controller.signal.aborted ||
      /timed out|timeout|AbortError/i.test(message);

    console.warn("[AUDIO BOOT] operation_failed", {
      label,
      url,
      status: isTimeout ? 0 : undefined,
      timeoutMs,
      durationMs,
      error: message,
      stack,
    });

    queueClientLog({
      type: "warning",
      message: `audio_boot_operation_failed:${label}`,
      context: "audio_boot",
      route: typeof window !== "undefined" ? window.location.pathname : undefined,
      meta: {
        label,
        url,
        timeoutMs,
        durationMs,
        error: message.slice(0, 500),
        stack: stack?.slice(0, 2000),
      },
    });

    return {
      ok: false,
      timeoutMs,
      durationMs,
      url,
      label,
      error: isTimeout ? `Request timed out after ${timeoutMs}ms` : message,
      stack,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

async function probeAudioApiHealth(): Promise<{ ok: boolean; status?: number }> {
  const { getApiUrl } = await import("@/lib/api");
  const url = getApiUrl("/api/healthz/audio");

  const op = await runStartupAudioOperation("audio_api_health", url, HEALTH_PROBE_TIMEOUT_MS, async () => {
    const res = await fetch(url, { cache: "no-store", credentials: "omit" });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean };
    return { status: res.status, healthy: res.ok && body.ok === true };
  });

  if (!op.ok || !op.result) return { ok: false, status: op.status };
  return { ok: op.result.healthy, status: op.result.status };
}

async function probeStaticAudioHealth(): Promise<{ ok: boolean; status?: number }> {
  const { getApiUrl } = await import("@/lib/api");
  const { recordClientCdnCacheStatus } = await import("@/lib/static-audio-telemetry");
  const url = getApiUrl("/api/static-audio/health");

  const op = await runStartupAudioOperation("static_audio_health", url, STATIC_HEALTH_TIMEOUT_MS, async () => {
    const res = await fetch(url, { cache: "no-store" });
    recordClientCdnCacheStatus(url, res);
    const body = (await res.json().catch(() => ({}))) as {
      gcs?: boolean;
      status?: string;
      circuitOpen?: boolean;
      gcsProbeOk?: boolean;
    };

    // Degraded server circuit or pending GCS probe must not block voice features.
    const healthy =
      res.ok &&
      body.status === "ok" &&
      body.gcs === true &&
      body.gcsProbeOk !== false;

    return { status: res.status, healthy, body };
  });

  if (!op.ok || !op.result) return { ok: false, status: op.status };
  return { ok: op.result.healthy, status: op.result.status };
}

async function runWarmupPhase(): Promise<void> {
  const { initGlobalAudioWarmup } = await import("@/lib/global-audio-warmup");
  const { preloadSpeechSynthesisVoices } = await import("@/lib/emergency-audio");
  const { initPhonicsManifestValidation } = await import("@/lib/phonics-manifest-validation");

  initPhonicsManifestValidation();
  initGlobalAudioWarmup();
  preloadSpeechSynthesisVoices();
}

async function runAudioBootAttempt(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const { waitForAudioApiOnBoot, startAudioApiRecoveryWatcher, markAudioApiUnreachable } =
    await import("@/lib/audio-api-recovery");

  startAudioApiRecoveryWatcher();

  const apiProbe = await probeAudioApiHealth();
  let apiHealthy = apiProbe.ok;
  if (!apiHealthy) {
    apiHealthy = await waitForAudioApiOnBoot();
    if (!apiHealthy) markAudioApiUnreachable();
  }

  const healthProbe = await probeStaticAudioHealth();
  // Warmup can proceed when either probe succeeds — avoid false negatives on cold start.
  if (!healthProbe.ok && !apiHealthy) {
    return false;
  }

  await runWarmupPhase();
  return true;
}

function markBootSuccess(): void {
  bootSettled = true;
  bootSucceeded = true;
  voiceUnavailable = false;
  notifyVoiceStatus();
  trackAudioBootMetric("audioInitSuccess");
  trackAudioBootMetric("audioInitDuration", {
    succeeded: true,
    retries: retryGeneration,
  });
}

function markBootFailure(): void {
  bootSettled = true;
  bootSucceeded = false;
  voiceUnavailable = true;
  notifyVoiceStatus();
  trackAudioBootMetric("audioInitFailure", { retries: retryGeneration });
  trackAudioBootMetric("audioInitDuration", {
    succeeded: false,
    retries: retryGeneration,
  });
}

function scheduleRetry(): void {
  if (retryGeneration >= RETRY_DELAYS_MS.length) {
    markBootFailure();
    return;
  }

  const delay = RETRY_DELAYS_MS[retryGeneration]!;
  retryGeneration += 1;

  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void executeBootAttempt();
  }, delay);
}

async function executeBootAttempt(): Promise<void> {
  if (bootAttemptInFlight) return;
  bootAttemptInFlight = true;
  try {
    const ok = await runAudioBootAttempt();
    if (ok) {
      markBootSuccess();
      return;
    }
    scheduleRetry();
  } catch (err) {
    const { message, stack } = errorDetails(err);
    console.warn("[AUDIO BOOT] unhandled attempt error", { message, stack });
    scheduleRetry();
  } finally {
    bootAttemptInFlight = false;
  }
}

/** Fire-and-forget — call after React mount (never from pre-render bootstrap). */
export function scheduleAudioBoot(): void {
  if (bootScheduled || typeof window === "undefined") return;
  bootScheduled = true;
  bootStartedAt = performance.now();
  trackAudioBootMetric("audioInitStart");

  const runIdle =
    typeof window.requestIdleCallback === "function"
      ? (task: () => void) => window.requestIdleCallback(task, { timeout: 1500 })
      : (task: () => void) => window.setTimeout(task, 0);

  runIdle(() => {
    void executeBootAttempt();
  });
}

/** Test-only reset. */
export function resetAudioBootOrchestratorForTests(): void {
  bootScheduled = false;
  bootAttemptInFlight = false;
  bootSettled = false;
  bootSucceeded = false;
  voiceUnavailable = false;
  retryGeneration = 0;
  bootStartedAt = 0;
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
  voiceStatusListeners.clear();
}

export function getAudioBootStateForTests(): {
  bootScheduled: boolean;
  bootSettled: boolean;
  bootSucceeded: boolean;
  voiceUnavailable: boolean;
  retryGeneration: number;
} {
  return {
    bootScheduled,
    bootSettled,
    bootSucceeded,
    voiceUnavailable,
    retryGeneration,
  };
}
