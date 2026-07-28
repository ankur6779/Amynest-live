import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PersistedWorkflowState } from "../../types/workflow.js";
import { prepareRecovery, recoverUnit } from "./engine.js";

describe("workflow recovery", () => {
  it("resumes failed units from the latest checkpoint", () => {
    const unit = recoverUnit({
      id: "vu1",
      topicId: "t1",
      topicTitle: "Topic",
      status: "failed",
      currentPhase: "publishing",
      latestCheckpoint: "Rendered",
      artifacts: {},
      errors: ["upload failed"],
      warnings: [],
      retries: 1,
      phaseTimings: [],
    });

    assert.equal(unit.status, "queued");
    assert.equal(unit.currentPhase, "publishing");
    assert.deepEqual(unit.errors, []);
  });

  it("prepares persisted workflow state for safe resume", () => {
    const state = prepareRecovery({
      workflowId: "wf1",
      jobType: "GenerateOneVideo",
      status: "failed",
      trigger: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      videoUnits: [
        {
          id: "vu1",
          topicId: "t1",
          topicTitle: "Topic",
          status: "failed",
          currentPhase: "rendering",
          latestCheckpoint: "AssetsReady",
          artifacts: {},
          errors: ["render failed"],
          warnings: [],
          retries: 0,
          phaseTimings: [],
        },
      ],
      checkpoints: [],
      events: [],
      retries: 1,
      errors: ["render failed"],
      warnings: [],
      queueWaitTimeMs: 0,
    } satisfies PersistedWorkflowState);

    assert.equal(state.status, "queued");
    assert.equal(state.completedAt, null);
    assert.equal(state.videoUnits[0]?.currentPhase, "rendering");
  });
});
