import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldReleaseUserSlotOnPatch, isTerminalAiJobStatus } from "./job-results.js";

describe("AI job user-slot release", () => {
  it("treats completed/failed/timed_out as terminal", () => {
    assert.equal(isTerminalAiJobStatus("completed"), true);
    assert.equal(isTerminalAiJobStatus("failed"), true);
    assert.equal(isTerminalAiJobStatus("timed_out"), true);
    assert.equal(isTerminalAiJobStatus("queued"), false);
    assert.equal(isTerminalAiJobStatus("processing"), false);
    assert.equal(isTerminalAiJobStatus(undefined), false);
  });

  it("releases only on first transition into a terminal status", () => {
    assert.equal(shouldReleaseUserSlotOnPatch("processing", "completed"), true);
    assert.equal(shouldReleaseUserSlotOnPatch("queued", "failed"), true);
    assert.equal(shouldReleaseUserSlotOnPatch("processing", "timed_out"), true);
  });

  it("does not re-release when poll finalize patches a completed job", () => {
    assert.equal(shouldReleaseUserSlotOnPatch("completed", "completed"), false);
    assert.equal(shouldReleaseUserSlotOnPatch("failed", "failed"), false);
    assert.equal(shouldReleaseUserSlotOnPatch("timed_out", "timed_out"), false);
  });
});
