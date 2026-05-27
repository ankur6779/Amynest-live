/**
 * Phase 1 self-healing controller — metrics-driven auto-actions + recovery loop.
 */

import {
  applyAdminOpsAction,
  applySelfHealInfraFlag,
  getAdminOpsState,
  getSelfHealActorId,
} from "./admin-ops-store.js";
import {
  getHealthLatches,
  shouldDisableApi,
  shouldDisableStreaming,
  shouldEnterSafeMode,
  shouldExitSafeMode,
  shouldEnableApi,
  updateHealthLatches,
} from "./heal-hysteresis.js";
import { healLog, scheduleJitteredInterval, tryHealAction, tryHealRecoveryAction } from "./heal-stability-guard.js";
import { evaluateSelfHealAlerts } from "./admin-alert-hooks.js";
import {
  collectSystemMetrics,
  getSystemHealthState,
  markSystemComponentRecovered,
  probeApiHealthy,
  probeCacheHealthy,
  probeDbHealthy,
  probeStreamingHealthy,
  probeWorkerHealthy,
  updateSystemHealthFromMetrics,
  type SystemMetrics,
} from "./system-health-store.js";

const METRICS_INTERVAL_MS = Number(process.env.SELF_HEAL_METRICS_MS ?? 20_000);
const RECOVERY_INTERVAL_MS = Number(process.env.SELF_HEAL_RECOVERY_MS ?? 60_000);
const CACHE_PREWARM_COOLDOWN_MS = 10 * 60 * 1000;

const SELF_HEAL_ACTOR = getSelfHealActorId();

let metricsTimer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null = null;
let recoveryTimer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null = null;
let lastCachePrewarmAt = 0;
let started = false;

export type SelfHealActionLog = {
  event: "self_heal_action";
  action: string;
  reason: string;
  metrics?: Partial<SystemMetrics>;
};

function logSelfHealAction(action: string, reason: string, metrics?: Partial<SystemMetrics>): void {
  const payload: SelfHealActionLog = { event: "self_heal_action", action, reason, metrics };
  healLog("warn", payload, `self-heal: ${action} (${reason})`, { always: true });
}

function guardedRecoveryAction(action: string, reason: string, fn: () => void, metrics?: Partial<SystemMetrics>): void {
  if (!tryHealRecoveryAction()) return;
  fn();
  logSelfHealAction(action, reason, metrics);
}

function guardedAction(action: string, reason: string, fn: () => void, metrics?: Partial<SystemMetrics>): void {
  if (!tryHealAction()) return;
  fn();
  logSelfHealAction(action, reason, metrics);
}

function openApiCircuit(metrics: SystemMetrics): void {
  const ops = getAdminOpsState();
  if (ops.disableApi) return;
  guardedAction("disable_api", "high_api_error_rate", () => {
    applyAdminOpsAction("disable_api", SELF_HEAL_ACTOR);
  }, { apiErrorRate: metrics.apiErrorRate });
}

function closeApiCircuit(): void {
  const ops = getAdminOpsState();
  if (!ops.disableApi || ops.updatedBy !== SELF_HEAL_ACTOR) return;
  guardedRecoveryAction("enable_api", "api_recovered", () => {
    applyAdminOpsAction("enable_api", SELF_HEAL_ACTOR);
  });
}

function disableStreamingGlobally(metrics: SystemMetrics): void {
  const ops = getAdminOpsState();
  if (ops.disableStreaming) return;
  guardedAction("disable_streaming", "high_stall_rate", () => {
    applyAdminOpsAction("disable_streaming", SELF_HEAL_ACTOR);
  }, { streamingStallRate: metrics.streamingStallRate });
}

function enableStreamingGlobally(): void {
  const ops = getAdminOpsState();
  if (!ops.disableStreaming || ops.updatedBy !== SELF_HEAL_ACTOR) return;
  guardedRecoveryAction("enable_streaming", "streaming_recovered", () => {
    applyAdminOpsAction("enable_streaming", SELF_HEAL_ACTOR);
  });
}

async function triggerCachePrewarm(metrics: SystemMetrics): Promise<void> {
  const now = Date.now();
  if (now - lastCachePrewarmAt < CACHE_PREWARM_COOLDOWN_MS) return;
  if (!tryHealAction(now)) return;
  lastCachePrewarmAt = now;
  logSelfHealAction("cache_prewarm", "low_cache_hit_rate", {
    cacheHitRate: metrics.cacheHitRate,
  });
  try {
    const { prewarmStaticAudioBuffers } = await import("./staticAudioLoader.js");
    await prewarmStaticAudioBuffers();
  } catch (err) {
    healLog(
      "warn",
      {
        evt: "self_heal.cache_prewarm_failed",
        err,
        message: err instanceof Error ? err.message : String(err),
      },
      "cache prewarm failed during self-heal",
      { always: true },
    );
  }
}

function pausePregeneration(metrics: SystemMetrics): void {
  if (getAdminOpsState().pregenerationPaused) return;
  guardedAction("pause_pregeneration", "worker_queue_delay", () => {
    applySelfHealInfraFlag("pregenerationPaused", true);
  }, { workerQueueDelayMs: metrics.workerQueueDelayMs });
}

function resumePregeneration(): void {
  if (!getAdminOpsState().pregenerationPaused) return;
  guardedRecoveryAction("resume_pregeneration", "worker_recovered", () => {
    applySelfHealInfraFlag("pregenerationPaused", false);
  });
}

function reduceDbUsage(metrics: SystemMetrics): void {
  if (getAdminOpsState().reduceDbReads) return;
  guardedAction("reduce_db_reads", "db_latency_high", () => {
    applySelfHealInfraFlag("reduceDbReads", true);
  }, { dbLatencyMs: metrics.dbLatencyMs });
}

function restoreDbUsage(): void {
  if (!getAdminOpsState().reduceDbReads) return;
  guardedRecoveryAction("restore_db_reads", "db_recovered", () => {
    applySelfHealInfraFlag("reduceDbReads", false);
  });
}

export function enableSafeMode(metrics: SystemMetrics): void {
  const ops = getAdminOpsState();
  if (ops.safeMode) return;
  guardedAction("enable_safe_mode", "global_failure_rate", () => {
    applyAdminOpsAction("enable_safe_mode", SELF_HEAL_ACTOR);
  }, { audioFailureRate: metrics.audioFailureRate });
}

function disableSafeMode(): void {
  const ops = getAdminOpsState();
  if (!ops.safeMode || ops.updatedBy !== SELF_HEAL_ACTOR) return;
  guardedRecoveryAction("disable_safe_mode", "system_recovered", () => {
    applyAdminOpsAction("disable_safe_mode", SELF_HEAL_ACTOR);
  });
}

function evaluateAutoActions(metrics: SystemMetrics): void {
  const ops = getAdminOpsState();
  if (!ops.selfHealEnabled) return;

  const latches = updateHealthLatches({
    apiErrorRate: metrics.apiErrorRate,
    streamingStallRate: metrics.streamingStallRate,
    failureRate: metrics.audioFailureRate,
  });

  if (!latches.apiHealthy && shouldDisableApi(metrics.apiErrorRate)) {
    openApiCircuit(metrics);
  }

  if (!latches.streamingHealthy && shouldDisableStreaming(metrics.streamingStallRate)) {
    disableStreamingGlobally(metrics);
  }

  if (metrics.cacheHitRate > 0 && metrics.cacheHitRate < 0.3) {
    void triggerCachePrewarm(metrics);
  }

  if (metrics.workerQueueDelayMs > 5000) {
    pausePregeneration(metrics);
  }

  if (metrics.dbLatencyMs > 300) {
    reduceDbUsage(metrics);
  }

  if (latches.safeModeActive && shouldEnterSafeMode(metrics.audioFailureRate)) {
    enableSafeMode(metrics);
  }
}

async function tryHalfOpenApiRecovery(): Promise<boolean> {
  const ops = getAdminOpsState();
  if (!ops.disableApi || ops.updatedBy !== SELF_HEAL_ACTOR) return false;

  const ok = await probeApiHealthy();
  if (!ok) return false;

  closeApiCircuit();
  markSystemComponentRecovered("apiHealthy");
  return true;
}

async function runRecoveryCycle(): Promise<void> {
  const ops = getAdminOpsState();
  if (!ops.selfHealEnabled) return;

  let metrics: SystemMetrics | null = null;
  try {
    metrics = await collectSystemMetrics();
    updateSystemHealthFromMetrics(metrics);
  } catch {
    /* use last known health state */
  }

  const health = getSystemHealthState();
  const latches = getHealthLatches();

  if (ops.disableApi && ops.updatedBy === SELF_HEAL_ACTOR) {
    await tryHalfOpenApiRecovery();
  } else if (latches.apiHealthy && !health.apiHealthy && metrics && metrics.apiErrorRate < 0.03) {
    closeApiCircuit();
    markSystemComponentRecovered("apiHealthy");
  }

  if (!latches.streamingHealthy) {
    if (await probeStreamingHealthy()) {
      enableStreamingGlobally();
      markSystemComponentRecovered("streamingHealthy");
    }
  }

  if (!health.workerHealthy) {
    if (await probeWorkerHealthy()) {
      resumePregeneration();
      markSystemComponentRecovered("workerHealthy");
    }
  }

  if (!health.cacheHealthy) {
    if (await probeCacheHealthy()) {
      markSystemComponentRecovered("cacheHealthy");
      healLog(
        "warn",
        { event: "self_heal_action", action: "cache_recovered", reason: "cache_hit_rate_ok" },
        "self-heal: cache_recovered",
        { always: true },
      );
    }
  }

  if (!health.dbHealthy) {
    if (await probeDbHealthy()) {
      restoreDbUsage();
      markSystemComponentRecovered("dbHealthy");
    }
  }

  if (
    ops.safeMode &&
    metrics &&
    shouldExitSafeMode(metrics.audioFailureRate) &&
    latches.apiHealthy &&
    latches.streamingHealthy
  ) {
    disableSafeMode();
  }

  if (metrics) {
    await evaluateSelfHealAlerts(metrics);
  }
}

async function runMetricsTick(): Promise<void> {
  try {
    const metrics = await collectSystemMetrics();
    updateSystemHealthFromMetrics(metrics);
    evaluateAutoActions(metrics);
    await evaluateSelfHealAlerts(metrics);
  } catch (err) {
    healLog(
      "error",
      {
        evt: "self_heal.metrics_tick_failed",
        err,
        message: err instanceof Error ? err.message : String(err),
      },
      "self-heal metrics tick failed",
      { always: true },
    );
  }
}

export function startSelfHealingController(): void {
  if (started || process.env.SELF_HEAL_ENABLED === "0") return;
  started = true;

  healLog(
    "info",
    {
      evt: "self_heal.start",
      metricsIntervalMs: METRICS_INTERVAL_MS,
      recoveryIntervalMs: RECOVERY_INTERVAL_MS,
    },
    "self-healing controller started",
  );

  void runMetricsTick();
  metricsTimer = scheduleJitteredInterval(METRICS_INTERVAL_MS, () => void runMetricsTick());
  recoveryTimer = scheduleJitteredInterval(RECOVERY_INTERVAL_MS, () => void runRecoveryCycle());
}

export function stopSelfHealingController(): void {
  if (metricsTimer) {
    clearInterval(metricsTimer as ReturnType<typeof setInterval>);
    clearTimeout(metricsTimer as ReturnType<typeof setTimeout>);
    metricsTimer = null;
  }
  if (recoveryTimer) {
    clearInterval(recoveryTimer as ReturnType<typeof setInterval>);
    clearTimeout(recoveryTimer as ReturnType<typeof setTimeout>);
    recoveryTimer = null;
  }
  started = false;
}

/** Test-only reset. */
export function resetSelfHealingControllerForTests(): void {
  stopSelfHealingController();
  lastCachePrewarmAt = 0;
}
