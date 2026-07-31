import type {
  AlertThresholds,
  BusCounters,
  KgCounters,
  LatencyStats,
  PerfCounters,
  RuntimeCounters,
  TelemetryAlert,
} from "./types.js";

export type AlertEvalInput = {
  runtime: RuntimeCounters;
  bus: BusCounters;
  kg: KgCounters;
  perf: PerfCounters;
  latency: LatencyStats;
  repairTimestamps: number[];
  lastRecByChild: Map<string, { nodeId: string; streak: number }>;
};

/** Declarative production alert definitions — evaluate against live counters. */
export const ALERT_DEFINITIONS = [
  {
    id: "runtime_latency_high" as const,
    severity: "warn" as const,
    description: "Decision latency exceeds threshold (p95 or last sample).",
    defaultThresholdKey: "runtimeLatencyMs" as const,
  },
  {
    id: "queue_depth_high" as const,
    severity: "warn" as const,
    description: "Offline event queue depth grew unexpectedly.",
    defaultThresholdKey: "queueDepth" as const,
  },
  {
    id: "repair_spike" as const,
    severity: "critical" as const,
    description: "Knowledge graph repair frequency spiked in the sliding window.",
    defaultThresholdKey: "repairWindowCount" as const,
  },
  {
    id: "storage_limit" as const,
    severity: "warn" as const,
    description: "Persisted KG snapshot exceeds storage budget.",
    defaultThresholdKey: "storageBytes" as const,
  },
  {
    id: "recommendations_repetitive" as const,
    severity: "info" as const,
    description: "Same recommendation ignored repeatedly without acceptance.",
    defaultThresholdKey: "recommendationRepeat" as const,
  },
  {
    id: "offline_duration_high" as const,
    severity: "info" as const,
    description: "Client was offline longer than expected.",
    defaultThresholdKey: "offlineDurationMs" as const,
  },
  {
    id: "flush_slow" as const,
    severity: "warn" as const,
    description: "Offline queue flush duration exceeded threshold.",
    defaultThresholdKey: "flushDurationMs" as const,
  },
  {
    id: "snapshot_large" as const,
    severity: "warn" as const,
    description: "Single KG snapshot size is large — watch deserialize cost.",
    defaultThresholdKey: "snapshotBytes" as const,
  },
] as const;

export function evaluateAlerts(
  input: AlertEvalInput,
  thresholds: AlertThresholds,
): TelemetryAlert[] {
  const at = new Date().toISOString();
  const out: TelemetryAlert[] = [];
  const { latency, bus, kg, lastRecByChild, repairTimestamps } = input;

  const latencyProbe = Math.max(latency.p95Ms, latency.lastMs);
  if (latency.count > 0 && latencyProbe > thresholds.runtimeLatencyMs) {
    out.push({
      id: "runtime_latency_high",
      severity: latencyProbe > thresholds.runtimeLatencyMs * 2 ? "critical" : "warn",
      message: `Runtime decision latency ${latencyProbe.toFixed(2)}ms > ${thresholds.runtimeLatencyMs}ms`,
      value: latencyProbe,
      threshold: thresholds.runtimeLatencyMs,
      at,
    });
  }

  if (bus.queueDepthLast > thresholds.queueDepth) {
    out.push({
      id: "queue_depth_high",
      severity: bus.queueDepthLast > thresholds.queueDepth * 2 ? "critical" : "warn",
      message: `Offline queue depth ${bus.queueDepthLast} > ${thresholds.queueDepth}`,
      value: bus.queueDepthLast,
      threshold: thresholds.queueDepth,
      at,
    });
  }

  const now = Date.now();
  const recentRepairs = repairTimestamps.filter(
    (t) => now - t <= thresholds.repairWindowMs,
  ).length;
  if (recentRepairs >= thresholds.repairWindowCount) {
    out.push({
      id: "repair_spike",
      severity: "critical",
      message: `${recentRepairs} KG repairs in ${thresholds.repairWindowMs}ms window`,
      value: recentRepairs,
      threshold: thresholds.repairWindowCount,
      at,
    });
  }

  if (kg.snapshotBytes > thresholds.storageBytes) {
    out.push({
      id: "storage_limit",
      severity: "warn",
      message: `KG storage ${kg.snapshotBytes} bytes > ${thresholds.storageBytes}`,
      value: kg.snapshotBytes,
      threshold: thresholds.storageBytes,
      at,
    });
  }

  if (kg.snapshotBytes > thresholds.snapshotBytes) {
    out.push({
      id: "snapshot_large",
      severity: "warn",
      message: `Largest/current snapshot ${kg.snapshotBytes} bytes > ${thresholds.snapshotBytes}`,
      value: kg.snapshotBytes,
      threshold: thresholds.snapshotBytes,
      at,
    });
  }

  for (const [, streak] of lastRecByChild) {
    if (streak.streak >= thresholds.recommendationRepeat) {
      out.push({
        id: "recommendations_repetitive",
        severity: "info",
        message: `Recommendation ${streak.nodeId} ignored ${streak.streak} times`,
        value: streak.streak,
        threshold: thresholds.recommendationRepeat,
        at,
      });
      break;
    }
  }

  const offlineMs = Math.max(
    bus.offlineDurationLastMs,
    bus.offlineStartedAt != null ? now - bus.offlineStartedAt : 0,
  );
  if (offlineMs > thresholds.offlineDurationMs) {
    out.push({
      id: "offline_duration_high",
      severity: "info",
      message: `Offline duration ${Math.round(offlineMs / 1000)}s > ${thresholds.offlineDurationMs / 1000}s`,
      value: offlineMs,
      threshold: thresholds.offlineDurationMs,
      at,
    });
  }

  if (bus.flushDurationMaxMs > thresholds.flushDurationMs) {
    out.push({
      id: "flush_slow",
      severity: "warn",
      message: `Flush max ${bus.flushDurationMaxMs.toFixed(2)}ms > ${thresholds.flushDurationMs}ms`,
      value: bus.flushDurationMaxMs,
      threshold: thresholds.flushDurationMs,
      at,
    });
  }

  return out;
}
