import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkflowVideoUnit } from "../../types/workflow.js";
import {
  checkpointIndex,
  createCheckpoint,
  hasCheckpoint,
  nextPhaseAfterCheckpoint,
} from "./engine.js";

describe("workflow checkpoints", () => {
  it("orders checkpoints and maps resume phases", () => {
    assert.ok(checkpointIndex("ContentGenerated") < checkpointIndex("Published"));
    assert.equal(nextPhaseAfterCheckpoint("ContentGenerated"), "storyboard-planning");
    assert.equal(nextPhaseAfterCheckpoint("Rendered"), "publishing");
    assert.equal(nextPhaseAfterCheckpoint(null), "topic-selection");

    const unit = {
      latestCheckpoint: "AssetsReady",
    } as WorkflowVideoUnit;
    assert.equal(hasCheckpoint(unit, "StoryboardReady"), true);
    assert.equal(hasCheckpoint(unit, "Rendered"), false);

    const cp = createCheckpoint("wf1", "vu1", "Rendered");
    assert.equal(cp.name, "Rendered");
    assert.equal(cp.workflowId, "wf1");
  });
});
