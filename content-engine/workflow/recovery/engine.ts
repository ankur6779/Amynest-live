import type { PersistedWorkflowState, WorkflowVideoUnit } from "../../types/workflow.js";
import {
  hasCheckpoint,
  nextPhaseAfterCheckpoint,
} from "../checkpoints/index.js";

/** Prepare a persisted workflow for safe resume from the latest checkpoint. */
export function prepareRecovery(
  state: PersistedWorkflowState,
): PersistedWorkflowState {
  const videoUnits = state.videoUnits.map((unit) => recoverUnit(unit));
  return {
    ...state,
    status: "queued",
    completedAt: null,
    updatedAt: new Date().toISOString(),
    videoUnits,
    errors: [],
  };
}

export function recoverUnit(unit: WorkflowVideoUnit): WorkflowVideoUnit {
  if (unit.status === "completed" && hasCheckpoint(unit, "Published")) {
    return { ...unit, currentPhase: "completed" };
  }

  const phase = nextPhaseAfterCheckpoint(unit.latestCheckpoint);
  return {
    ...unit,
    status: "queued",
    currentPhase: phase,
    errors: [],
  };
}

/** True when prior successful phases can be skipped. */
export function canSkipToPhase(
  unit: WorkflowVideoUnit,
  requiredCheckpoint: Parameters<typeof hasCheckpoint>[1],
): boolean {
  return hasCheckpoint(unit, requiredCheckpoint);
}
