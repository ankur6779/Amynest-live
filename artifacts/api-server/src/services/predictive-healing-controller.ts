/**
 * Phase 2 predictive self-healing — trend detection + preventive actions (stability hardened).
 */

import { getAdminDashboard } from "./audio-health-store.js";
import { getApiHealthSnapshot } from "./api-health-store.js";
import {
  confirmPredictiveSignal,
  healLog,
  scheduleJitteredInterval,
  tryHealAction,
  tryHealRecoveryAction,
} from "./heal-stability-guard.js";
import {
  appendMetricSample,
  detectAnomaly,
  getMetricsHistory,
  getMetricSamples,
  isIncreasingTrend,
  isRisingFast,
} from "./predictive-trend-store.js";
import {
  canExitDegradedMode,
  disableDegradedMode,
  enableDegradedMode,
  getPredictiveOpsState,
  preemptivelyReduceApiUsage,
  prioritizeCacheOverApi,
  recordPredictedIncident,
  reduceStreamingWeight,
  relaxPredictiveAdjustments,
} from "./predictive-ops-store.js";
import { evaluatePredictiveAlerts, emitPredictiveInfoAlert } from "./admin-alert-hooks.js";
import { getAdminOpsState } from "./admin-ops-store.js";

const TICK_INTERVAL_MS = Number(process.env.PREDICTIVE_HEAL_TICK_MS ?? 30_000);

let tickTimer: ReturnType<typeof setInterval> | ReturnType<typeof setTimeout> | null = null;
let started = false;

export type PredictiveHealLog = {
  event: "predictive_heal_action";
  action: string;
  reason: string;
};

function logAction(action: string, reason: string): void {
  const payload: PredictiveHealLog = { event: "predictive_heal_action", action, reason };
  healLog("warn", payload, `predictive-heal: ${action} (${reason})`, { always: true });
}

function guardedPredictiveRecovery(action: string, reason: string, fn: () => void): boolean {
  if (!tryHealRecoveryAction()) return false;
  fn();
  logAction(action, reason);
  return true;
}

function guardedPredictiveAction(action: string, reason: string, fn: () => void): boolean {
  if (!tryHealAction()) return false;
  fn();
  logAction(action, reason);
  return true;
}

function maxApiErrorRate(now: number): number {
  const snap = getApiHealthSnapshot(now);
  return snap.routes.reduce((max, route) => Math.max(max, route.errorRate), 0);
}

function computeStreamingStallRate(
  layerHealth: ReturnType<typeof getAdminDashboard>["layerHealth"],
): number {
  const streaming = layerHealth.find((l) => l.layer === "streaming");
  if (!streaming || streaming.total === 0) return 0;
  return streaming.failurePct;
}

function collectSample(now: number): void {
  const dashboard = getAdminDashboard(now);
  appendMetricSample({
    apiErrorRate: maxApiErrorRate(now),
    ttfa: dashboard.avgTTFA,
    streamingStallRate: computeStreamingStallRate(dashboard.layerHealth),
    failureRate: dashboard.failureRate,
  }, now);
}

function recordPredictiveIncidentWithAlert(
  cause: string,
  metric: string,
  value: number,
  now: number,
): void {
  recordPredictedIncident(cause, metric, value, now);
  void emitPredictiveInfoAlert(cause, metric, value, now);
}

async function evaluateTrendRules(now: number): Promise<void> {
  const ops = getAdminOpsState();
  if (!ops.selfHealEnabled || ops.safeMode) return;

  const history = getMetricsHistory(now);
  const samples = getMetricSamples(now);
  if (samples.length < 3) return;

  const latest = samples[samples.length - 1]!;
  let preventiveActions = 0;

  const apiTrend =
    confirmPredictiveSignal(
      "api_error_trend",
      isIncreasingTrend(history.apiErrorRate) && latest.apiErrorRate > 0.03,
    );
  if (apiTrend) {
    if (guardedPredictiveAction("preemptive_reduce_api", "increasing_api_error_trend", preemptivelyReduceApiUsage)) {
      recordPredictiveIncidentWithAlert("api_degrading", "apiErrorRate", latest.apiErrorRate, now);
      preventiveActions += 1;
    }
  }

  const apiAnomaly =
    confirmPredictiveSignal(
      "api_anomaly",
      detectAnomaly(latest.apiErrorRate, history.apiErrorRate) && latest.apiErrorRate > 0.02,
    );
  if (apiAnomaly) {
    if (guardedPredictiveAction("preemptive_reduce_api", "api_error_anomaly", preemptivelyReduceApiUsage)) {
      recordPredictiveIncidentWithAlert("api_anomaly", "apiErrorRate", latest.apiErrorRate, now);
      preventiveActions += 1;
    }
  }

  const ttfaTrend =
    confirmPredictiveSignal(
      "ttfa_trend",
      isIncreasingTrend(history.ttfa) && latest.ttfa > 800,
    );
  if (ttfaTrend) {
    if (guardedPredictiveAction("prioritize_cache", "increasing_ttfa_trend", prioritizeCacheOverApi)) {
      recordPredictiveIncidentWithAlert("ttfa_spike_predicted", "ttfa", latest.ttfa, now);
      preventiveActions += 1;
    }
  }

  const ttfaAnomaly =
    confirmPredictiveSignal(
      "ttfa_anomaly",
      detectAnomaly(latest.ttfa, history.ttfa) && latest.ttfa > 600,
    );
  if (ttfaAnomaly) {
    if (guardedPredictiveAction("prioritize_cache", "ttfa_anomaly", prioritizeCacheOverApi)) {
      recordPredictiveIncidentWithAlert("ttfa_anomaly", "ttfa", latest.ttfa, now);
      preventiveActions += 1;
    }
  }

  const streamingSignal =
    confirmPredictiveSignal(
      "streaming_stall",
      isRisingFast(history.streamingStallRate) ||
        (isIncreasingTrend(history.streamingStallRate) && latest.streamingStallRate > 0.06),
    );
  if (streamingSignal) {
    if (guardedPredictiveAction("reduce_streaming_weight", "rising_stall_rate", reduceStreamingWeight)) {
      recordPredictiveIncidentWithAlert(
        "streaming_instability_predicted",
        "streamingStallRate",
        latest.streamingStallRate,
        now,
      );
      preventiveActions += 1;
    }
  }

  const failureAnomaly =
    confirmPredictiveSignal(
      "failure_anomaly",
      detectAnomaly(latest.failureRate, history.failureRate) && latest.failureRate > 0.03,
    );
  if (failureAnomaly) {
    if (guardedPredictiveAction("enable_degraded_mode", "failure_rate_anomaly", enableDegradedMode)) {
      recordPredictiveIncidentWithAlert("failure_rate_anomaly", "failureRate", latest.failureRate, now);
      preventiveActions += 1;
    }
  }

  if (
    preventiveActions >= 2 &&
    !getPredictiveOpsState().degradedMode &&
    confirmPredictiveSignal("multi_signal", preventiveActions >= 2)
  ) {
    if (guardedPredictiveAction("enable_degraded_mode", "multiple_preventive_signals", enableDegradedMode)) {
      recordPredictiveIncidentWithAlert("multi_signal_degradation", "composite", preventiveActions, now);
    }
  }

  const ttfaRising =
    ttfaTrend || ttfaAnomaly || (isIncreasingTrend(history.ttfa) && latest.ttfa > 800);
  const streamingUnstable = !!streamingSignal;
  await evaluatePredictiveAlerts(
    ttfaRising,
    streamingUnstable,
    latest.ttfa,
    latest.streamingStallRate,
    now,
  );
}

function evaluateRecovery(now: number): void {
  const ops = getAdminOpsState();
  if (!ops.selfHealEnabled) return;

  const history = getMetricsHistory(now);
  const samples = getMetricSamples(now);
  if (samples.length < 4) return;

  const latest = samples[samples.length - 1]!;
  const predictive = getPredictiveOpsState();

  const apiStable =
    latest.apiErrorRate <= 0.02 &&
    !isIncreasingTrend(history.apiErrorRate);
  const ttfaStable = latest.ttfa <= 700 && !isIncreasingTrend(history.ttfa);
  const streamingStable =
    latest.streamingStallRate <= 0.05 && !isRisingFast(history.streamingStallRate);
  const failureStable = latest.failureRate <= 0.02;

  if (
    predictive.degradedMode &&
    canExitDegradedMode(now) &&
    apiStable &&
    ttfaStable &&
    streamingStable &&
    failureStable
  ) {
    if (guardedPredictiveRecovery("disable_degraded_mode", "metrics_stabilized", disableDegradedMode)) {
      return;
    }
  }

  if (!predictive.degradedMode && apiStable && ttfaStable && streamingStable) {
    relaxPredictiveAdjustments();
  }
}

export function runPredictiveHealTick(now = Date.now()): void {
  collectSample(now);
  void evaluateTrendRules(now);
  evaluateRecovery(now);
}

export function startPredictiveHealingController(): void {
  if (started || process.env.PREDICTIVE_HEAL_ENABLED === "0") return;
  started = true;

  healLog(
    "info",
    { evt: "predictive_heal.start", tickIntervalMs: TICK_INTERVAL_MS },
    "predictive healing controller started",
  );

  runPredictiveHealTick();
  tickTimer = scheduleJitteredInterval(TICK_INTERVAL_MS, () => runPredictiveHealTick());
}

export function stopPredictiveHealingController(): void {
  if (tickTimer) {
    clearInterval(tickTimer as ReturnType<typeof setInterval>);
    clearTimeout(tickTimer as ReturnType<typeof setTimeout>);
    tickTimer = null;
  }
  started = false;
}

/** Test-only reset. */
export function resetPredictiveHealingControllerForTests(): void {
  stopPredictiveHealingController();
}
