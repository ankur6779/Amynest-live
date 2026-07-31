import type {
  AlertThresholds,
  BusCounters,
  KgCounters,
  LatencyStats,
  RuntimeCounters,
  TelemetryAlert,
} from "./types.js";

export function computeHealthScore(input: {
  latency: LatencyStats;
  bus: BusCounters;
  kg: KgCounters;
  runtime: RuntimeCounters;
  thresholds: AlertThresholds;
  activeAlerts: TelemetryAlert[];
}): number {
  let score = 100;
  const { latency, bus, kg, runtime, thresholds, activeAlerts } = input;

  if (latency.count > 0) {
    const probe = Math.max(latency.p95Ms, latency.lastMs);
    if (probe > thresholds.runtimeLatencyMs * 2) score -= 25;
    else if (probe > thresholds.runtimeLatencyMs) score -= 12;
  }

  if (bus.queueDepthLast > thresholds.queueDepth * 2) score -= 20;
  else if (bus.queueDepthLast > thresholds.queueDepth) score -= 10;

  if (kg.repairCount > 0) score -= Math.min(15, kg.repairCount * 3);
  if (kg.snapshotBytes > thresholds.storageBytes) score -= 15;

  const offered = runtime.recommendationOffered;
  if (offered >= 5) {
    const ignoreRate = runtime.recommendationIgnored / offered;
    if (ignoreRate > 0.85) score -= 8;
  }

  for (const a of activeAlerts) {
    if (a.severity === "critical") score -= 10;
    else if (a.severity === "warn") score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
