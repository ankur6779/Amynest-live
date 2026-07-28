import { freemem, totalmem } from "node:os";
import type { RuntimeMetrics } from "../../types/operations.js";
import type { TelemetryEvent } from "../../telemetry/index.js";

export interface MetricsCollectorOptions {
  queueLength?: number;
  crashCount?: number;
  diskFreeMb?: number;
  now?: () => Date;
}

/** Collect structured runtime metrics from telemetry + system signals. */
export function collectRuntimeMetrics(
  events: readonly TelemetryEvent[],
  options: MetricsCollectorOptions = {},
): RuntimeMetrics {
  const workflows = events.filter((e) => e.name.startsWith("workflow."));
  const successes = workflows.filter(
    (e) => e.metadata?.status === "completed" || e.name.includes("completed"),
  ).length;
  const failures = workflows.filter(
    (e) =>
      e.errors.length > 0 ||
      e.metadata?.status === "failed" ||
      e.name.includes("failed"),
  ).length;
  const total = Math.max(1, successes + failures);

  const avg = (namePrefix: string): number => {
    const matched = events.filter((e) => e.name.startsWith(namePrefix));
    if (matched.length === 0) return 0;
    return Math.round(
      matched.reduce((sum, e) => sum + e.generationTimeMs, 0) / matched.length,
    );
  };

  const retries = events.reduce((sum, e) => sum + e.retryCount, 0);
  const providerFailures = events.filter((e) => e.errors.length > 0).length;
  const memoryUsagePercent = Math.round((1 - freemem() / totalmem()) * 100);
  const crashCount = options.crashCount ?? 0;
  const availability = Number(
    Math.max(0, Math.min(1, 1 - crashCount / Math.max(10, total))).toFixed(4),
  );

  return {
    workflowSuccessRate: Number((successes / total).toFixed(4)),
    workflowFailures: failures,
    workflowSuccesses: successes,
    queueLength: options.queueLength ?? 0,
    renderDurationMsAvg: avg("render."),
    uploadDurationMsAvg: avg("publishing."),
    analyticsDurationMsAvg: avg("analytics."),
    cpuUsagePercent: 0,
    memoryUsagePercent,
    diskFreeMb: options.diskFreeMb ?? 0,
    providerFailures,
    retryCounts: retries,
    crashCount,
    availability,
    collectedAt: (options.now ?? (() => new Date()))().toISOString(),
  };
}
