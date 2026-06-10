import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeIdleMs,
  defaultEngagementState,
  recordEngagementOutcome,
} from "./emotional-state.ts";

describe("math-playground-engagement emotional-state", () => {
  it("resets failure streak on success", () => {
    let state = defaultEngagementState(1000);
    state = recordEngagementOutcome(state, "failure", 2000);
    state = recordEngagementOutcome(state, "success", 3000);
    assert.equal(state.consecutiveFailures, 0);
    assert.equal(state.consecutiveSuccesses, 1);
  });

  it("computes idle duration", () => {
    const state = { ...defaultEngagementState(1000), lastInteractionAt: 1000 };
    assert.equal(computeIdleMs(state, 9000), 8000);
  });
});
