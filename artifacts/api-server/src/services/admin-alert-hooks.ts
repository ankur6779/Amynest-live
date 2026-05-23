/**
 * Alert trigger helpers — threshold checks wired from healing controllers.
 */

import type { SystemMetrics } from "./system-health-store.js";
import { getAdminOpsState } from "./admin-ops-store.js";
import { syncAdminAlertCondition, emitAdminAlert } from "./admin-alert-system.js";
import type { MonitoredService } from "./service-crash-store.js";

const FAILURE_RATE_CRITICAL = 0.05;
const FALLBACK_WARNING = 0.2;
const STREAMING_UNSTABLE = 0.1;
const TTFA_RISING_MS = 800;

export async function evaluateSelfHealAlerts(metrics: SystemMetrics, now = Date.now()): Promise<void> {
  const ops = getAdminOpsState();

  await syncAdminAlertCondition(
    metrics.audioFailureRate > FAILURE_RATE_CRITICAL,
    {
      severity: "critical",
      module: "lesson",
      issue: "Audio failure spike",
      metric: "failureRate",
      value: metrics.audioFailureRate * 100,
      actionTaken: ops.safeMode ? "safe_mode_enabled" : undefined,
    },
    "✅ Audio failure rate normalized, system normal",
    now,
  );

  await syncAdminAlertCondition(
    ops.safeMode,
    {
      severity: "critical",
      module: "system",
      issue: "Safe mode activated",
      metric: "failureRate",
      value: metrics.audioFailureRate * 100,
      actionTaken: "safe_mode_enabled",
    },
    "✅ Safe mode deactivated, system normal",
    now,
  );

  await syncAdminAlertCondition(
    metrics.fallbackRate > FALLBACK_WARNING,
    {
      severity: "warning",
      module: "lesson",
      issue: "High fallback usage",
      metric: "fallbackRate",
      value: metrics.fallbackRate * 100,
    },
    "✅ Fallback rate normalized, system normal",
    now,
  );

  await syncAdminAlertCondition(
    metrics.streamingStallRate > STREAMING_UNSTABLE,
    {
      severity: "warning",
      module: "streaming",
      issue: "Streaming unstable",
      metric: "streamingStallRate",
      value: metrics.streamingStallRate * 100,
      actionTaken: ops.disableStreaming ? "streaming_disabled" : undefined,
    },
    "✅ Streaming stabilized, system normal",
    now,
  );

  await syncAdminAlertCondition(
    !ops.disableApi && metrics.apiErrorRate > 0.05,
    {
      severity: "critical",
      module: "api",
      issue: "API error rate critical",
      metric: "apiErrorRate",
      value: metrics.apiErrorRate * 100,
      actionTaken: ops.disableApi ? "api_disabled" : undefined,
    },
    "✅ API recovered, system normal",
    now,
  );
}

export async function evaluatePredictiveAlerts(
  ttfaRising: boolean,
  streamingUnstable: boolean,
  latestTtfa: number,
  latestStallRate: number,
  now = Date.now(),
): Promise<void> {
  await syncAdminAlertCondition(
    ttfaRising && latestTtfa > TTFA_RISING_MS,
    {
      severity: "warning",
      module: "lesson",
      issue: "TTFA rising",
      metric: "ttfa",
      value: latestTtfa,
      actionTaken: "cache_prioritized",
    },
    "✅ TTFA stabilized, system normal",
    now,
  );

  await syncAdminAlertCondition(
    streamingUnstable,
    {
      severity: "warning",
      module: "streaming",
      issue: "Streaming instability predicted",
      metric: "streamingStallRate",
      value: latestStallRate * 100,
      actionTaken: "streaming_weight_reduced",
    },
    "✅ Streaming prediction cleared, system normal",
    now,
  );
}

export async function emitPredictiveInfoAlert(
  cause: string,
  metric: string,
  value: number,
  now = Date.now(),
): Promise<void> {
  await emitAdminAlert(
    {
      severity: "info",
      module: "predictive",
      issue: cause.replace(/_/g, " "),
      metric,
      value: metric.includes("Rate") ? value * 100 : value,
    },
    now,
  );
}

export async function alertServiceDown(
  service: MonitoredService | "multiple",
  detail?: Record<string, unknown>,
  now = Date.now(),
): Promise<void> {
  const label =
    service === "backend"
      ? "API"
      : service === "multiple"
        ? "Multiple services"
        : service.charAt(0).toUpperCase() + service.slice(1);

  await syncAdminAlertCondition(
    true,
    {
      severity: "critical",
      module: "infra",
      issue: `${label} down`,
      metric: "serviceStatus",
      value: 0,
      actionTaken: detail?.downCount != null ? "safe_mode_enabled" : "circuit_breaker_open",
    },
    `✅ ${label} recovered, system normal`,
    now,
  );
}

export async function alertServiceRecovered(
  service: MonitoredService | "multiple",
  now = Date.now(),
): Promise<void> {
  const label =
    service === "backend"
      ? "API"
      : service === "multiple"
        ? "Multiple services"
        : service.charAt(0).toUpperCase() + service.slice(1);

  await syncAdminAlertCondition(
    false,
    {
      severity: "critical",
      module: "infra",
      issue: `${label} down`,
      metric: "serviceStatus",
      value: 0,
    },
    `✅ ${label} recovered, system normal`,
    now,
  );
}
