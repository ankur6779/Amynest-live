import type {
  PhaseTiming,
  WorkflowTelemetry,
  WorkflowVideoUnit,
} from "../../types/workflow.js";

export function buildWorkflowTelemetry(input: {
  executionTimeMs: number;
  queueWaitTimeMs: number;
  videoUnits: WorkflowVideoUnit[];
  retryCount: number;
}): WorkflowTelemetry {
  const timings = input.videoUnits.flatMap((u) => u.phaseTimings);
  const averagePhaseDurationMs =
    timings.length === 0
      ? 0
      : Math.round(
          timings.reduce((sum, t) => sum + t.durationMs, 0) / timings.length,
        );
  const videosAttempted = input.videoUnits.length;
  const videosSucceeded = input.videoUnits.filter((u) => u.status === "completed").length;
  const videosFailed = input.videoUnits.filter((u) => u.status === "failed").length;
  const denominator = Math.max(1, videosAttempted);

  return {
    executionTimeMs: input.executionTimeMs,
    averagePhaseDurationMs,
    failureRate: videosFailed / denominator,
    retryCount: input.retryCount,
    successRate: videosSucceeded / denominator,
    queueWaitTimeMs: input.queueWaitTimeMs,
    videosAttempted,
    videosSucceeded,
    videosFailed,
  };
}

export function startPhaseTiming(phase: PhaseTiming["phase"]): { phase: PhaseTiming["phase"]; startedAt: string; startedMs: number } {
  return {
    phase,
    startedAt: new Date().toISOString(),
    startedMs: Date.now(),
  };
}

export function completePhaseTiming(
  started: { phase: PhaseTiming["phase"]; startedAt: string; startedMs: number },
): PhaseTiming {
  return {
    phase: started.phase,
    startedAt: started.startedAt,
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - started.startedMs,
  };
}
