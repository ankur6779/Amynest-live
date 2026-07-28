import type { OpsTelemetry, RuntimeMetrics } from "../../types/operations.js";
import type { TelemetryEvent } from "../../telemetry/index.js";

export function buildOpsTelemetry(input: {
  startupTimeMs: number;
  events: readonly TelemetryEvent[];
  metrics: RuntimeMetrics;
  recoveryDurationsMs?: number[];
  now?: () => Date;
}): OpsTelemetry {
  const providerEvents = input.events.filter((e) => e.provider && e.provider !== "ops");
  const providerLatencyMsAvg =
    providerEvents.length === 0
      ? 0
      : Math.round(
          providerEvents.reduce((sum, e) => sum + e.generationTimeMs, 0) /
            providerEvents.length,
        );

  const workflowEvents = input.events.filter((e) => e.name.startsWith("workflow."));
  const workflowTimeMsAvg =
    workflowEvents.length === 0
      ? 0
      : Math.round(
          workflowEvents.reduce((sum, e) => sum + e.generationTimeMs, 0) /
            workflowEvents.length,
        );

  const recovery = input.recoveryDurationsMs ?? [];
  const recoveryTimeMsAvg =
    recovery.length === 0
      ? 0
      : Math.round(recovery.reduce((a, b) => a + b, 0) / recovery.length);

  return {
    startupTimeMs: input.startupTimeMs,
    workflowTimeMsAvg,
    providerLatencyMsAvg,
    recoveryTimeMsAvg,
    crashCount: input.metrics.crashCount,
    availability: input.metrics.availability,
    recordedAt: (input.now ?? (() => new Date()))().toISOString(),
  };
}
