import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  advancePhaseMastery,
  createInitialSessionState,
  shouldAdvancePhaseMastery,
  toFullSessionState,
} from "../session-mastery";
import { isSessionComplete } from "../session-phases";

describe("session mastery", () => {
  it("creates session in warm_up phase", () => {
    const state = createInitialSessionState({
      sessionId: "s1",
      childId: 1,
      childName: "Mia",
      ageBand: "4-5",
    });
    assert.equal(state.phase, "warm_up");
    assert.ok(state.exercises.length > 0);
  });

  it("advances through phases on mastery", () => {
    let state = createInitialSessionState({
      sessionId: "s1",
      childId: 1,
      childName: "Mia",
      ageBand: "6-7",
    });
    state = { ...state, phaseAttempts: 2 };
    assert.equal(shouldAdvancePhaseMastery(state), true);
    state = advancePhaseMastery(state);
    assert.equal(state.phase, "repeat_after_amy");
  });

  it("advances after phase success", () => {
    let state = createInitialSessionState({
      sessionId: "s1",
      childId: 1,
      childName: "Mia",
      ageBand: "2-3",
    });
    state = { ...state, phaseSuccesses: 1 };
    assert.equal(shouldAdvancePhaseMastery(state), true);
  });

  it("marks session complete at celebration", () => {
    const state = createInitialSessionState({
      sessionId: "s1",
      childId: 1,
      childName: "Mia",
      ageBand: "8-10",
    });
    const celebrating = toFullSessionState({ ...state, phase: "celebration" });
    assert.equal(isSessionComplete(celebrating), true);
  });
});
