import type {
  WorkflowExecutionReport,
  WorkflowJobType,
  WorkflowStatus,
  WorkflowTrigger,
  WorkflowVideoUnit,
} from "../../types/workflow.js";

export function buildExecutionReport(input: {
  workflowId: string;
  jobType: WorkflowJobType;
  trigger: WorkflowTrigger;
  startedAt: string;
  completedAt: string | null;
  status: WorkflowStatus;
  videoUnits: WorkflowVideoUnit[];
  errors: string[];
  retries: number;
  warnings: string[];
}): WorkflowExecutionReport {
  return {
    workflowId: input.workflowId,
    jobType: input.jobType,
    trigger: input.trigger,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    status: input.status,
    videos: input.videoUnits.map((unit) => ({
      topic: unit.topicTitle,
      topicId: unit.topicId,
      videoId: unit.videoId ?? null,
      url: unit.url ?? null,
      durationSeconds: unit.artifacts.render?.duration ?? null,
      renderTimeMs: unit.artifacts.render?.telemetry.renderTimeMs ?? null,
      uploadTimeMs: unit.artifacts.published?.telemetry.uploadDurationMs ?? null,
      errors: [...unit.errors],
      retries: unit.retries,
      warnings: [...unit.warnings],
      latestCheckpoint: unit.latestCheckpoint,
    })),
    errors: [...input.errors],
    retries: input.retries,
    warnings: [...input.warnings],
  };
}
