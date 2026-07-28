import { prepareRecovery } from "../../workflow/recovery/index.js";
import type { WorkflowPersistenceStore } from "../../workflow/persistence/index.js";
import type { RecoveryPlan } from "../../types/operations.js";
import type { PersistedWorkflowState } from "../../types/workflow.js";

export interface RecoveryEngineOptions {
  store: WorkflowPersistenceStore;
}

/**
 * Resume after crash/restart/network/provider failure from latest checkpoint.
 * Never duplicates uploads; never regenerates completed phases.
 */
export class RecoveryEngine {
  constructor(private readonly options: RecoveryEngineOptions) {}

  listRecoverable(): RecoveryPlan[] {
    return this.options.store
      .list()
      .filter((s) => s.status === "failed" || s.status === "running" || s.status === "paused")
      .map((s) => this.planForState(s));
  }

  plan(workflowId: string): RecoveryPlan | undefined {
    const state = this.options.store.get(workflowId);
    if (!state) return undefined;
    return this.planForState(state);
  }

  prepare(workflowId: string): PersistedWorkflowState | undefined {
    const state = this.options.store.get(workflowId);
    if (!state) return undefined;
    const prepared = prepareRecovery(state);
    this.options.store.save(prepared);
    return prepared;
  }

  private planForState(state: PersistedWorkflowState): RecoveryPlan {
    const units = state.videoUnits;
    const checkpoints = units
      .map((u) => u.latestCheckpoint)
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
    const latest = checkpoints[checkpoints.length - 1];

    const completedPhases = [...new Set(checkpoints.map(String))];
    const published = units.some((u) => Boolean(u.artifacts.published) || Boolean(u.videoId));

    return {
      workflowId: state.workflowId,
      resumable: state.status !== "completed" && state.status !== "cancelled",
      latestCheckpoint: latest,
      skipPhases: completedPhases,
      reason:
        state.status === "failed"
          ? "Resume failed workflow from latest checkpoint"
          : "Resume interrupted workflow after restart",
      preventDuplicateUpload: published,
      preventRegeneration: completedPhases.length > 0,
    };
  }
}
