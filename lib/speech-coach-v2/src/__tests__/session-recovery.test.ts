import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  advancePhaseMastery,
  recordTurnResult,
  shouldAdvancePhaseMastery,
} from "../session-mastery";
import { evaluateSpeechResponse } from "../speech-evaluation";

describe("session recovery state", () => {
  it("persists phase and stars through turn recording", () => {
    const base = {
      sessionId: "s1",
      childId: 1,
      childName: "Mia",
      ageBand: "4-5" as const,
      phase: "repeat_after_amy" as const,
      phaseStartedAt: Date.now(),
      sessionStartedAt: Date.now(),
      exerciseIndex: 1,
      exercises: [],
      phaseAttempts: 0,
      phaseSuccesses: 0,
      starsEarned: 2,
      pointsEarned: 20,
      wordsSpoken: 5,
      sentencesCompleted: 1,
      turnCount: 1,
    };

    const evaluation = evaluateSpeechResponse({
      expected: "ball",
      transcript: "ball",
      rawTranscript: "ball",
    });

    const next = recordTurnResult(base, evaluation, 1, 1, 1, 10);
    assert.equal(next.starsEarned, 3);
    assert.equal(next.turnCount, 2);
    assert.equal(next.phase, "repeat_after_amy");
  });

  it("advances phase on mastery criteria for recovery sync", () => {
    let state = {
      sessionId: "s1",
      childId: 1,
      childName: "Mia",
      ageBand: "4-5" as const,
      phase: "warm_up" as const,
      phaseStartedAt: Date.now(),
      sessionStartedAt: Date.now(),
      exerciseIndex: 0,
      exercises: [],
      phaseAttempts: 2,
      phaseSuccesses: 0,
      starsEarned: 0,
      pointsEarned: 0,
      wordsSpoken: 0,
      sentencesCompleted: 0,
      turnCount: 2,
    };

    assert.equal(shouldAdvancePhaseMastery(state), true);
    state = advancePhaseMastery(state);
    assert.equal(state.phase, "repeat_after_amy");
    assert.equal(state.phaseAttempts, 0);
  });
});
