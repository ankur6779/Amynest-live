import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InMemoryWorkflowStore } from "../../workflow/persistence/index.js";
import type { PersistedWorkflowState } from "../../types/workflow.js";
import { RecoveryEngine } from "./engine.js";

describe("recovery engine", () => {
  it("plans resume without regenerating completed work or duplicating uploads", () => {
    const store = new InMemoryWorkflowStore();
    const state: PersistedWorkflowState = {
      workflowId: "wf_recover_1",
      jobType: "GenerateOneVideo",
      status: "failed",
      trigger: "manual",
      createdAt: "2026-07-28T09:00:00.000Z",
      updatedAt: "2026-07-28T09:05:00.000Z",
      completedAt: null,
      videoUnits: [
        {
          id: "vu_1",
          topicId: "parenting-001",
          topicTitle: "Parent tip",
          status: "failed",
          currentPhase: "publishing",
          latestCheckpoint: "Rendered",
          artifacts: {
            published: undefined,
          },
          errors: ["network"],
          warnings: [],
          retries: 1,
          phaseTimings: [],
          videoId: "vid_existing",
        },
      ],
      checkpoints: [],
      events: [],
      retries: 1,
      errors: ["network"],
      warnings: [],
      queueWaitTimeMs: 0,
    };
    store.save(state);

    const engine = new RecoveryEngine({ store });
    const plan = engine.plan("wf_recover_1");
    assert.ok(plan);
    assert.equal(plan!.resumable, true);
    assert.equal(plan!.latestCheckpoint, "Rendered");
    assert.equal(plan!.preventDuplicateUpload, true);
    assert.equal(plan!.preventRegeneration, true);

    const prepared = engine.prepare("wf_recover_1");
    assert.ok(prepared);
    assert.equal(prepared!.status, "queued");
  });
});
