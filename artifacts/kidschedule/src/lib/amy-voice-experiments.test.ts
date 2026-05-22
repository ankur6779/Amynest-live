import { describe, expect, it, beforeEach } from "vitest";
import {
  getAmyVoiceExperimentAssignment,
  getAmyVoiceExperimentModifiers,
  getAmyVoiceExperimentSnapshot,
  recordAmyVoiceExperimentOutcome,
  resetAmyVoiceExperimentsForTests,
  setAmyVoiceExperimentAssignmentForTests,
} from "./amy-voice-experiments";

describe("amy-voice-experiments", () => {
  beforeEach(() => {
    resetAmyVoiceExperimentsForTests();
    setAmyVoiceExperimentAssignmentForTests({
      encouragement_frequency: "frequent",
      pacing: "slower",
      instruction_style: "conversational",
    });
  });

  it("applies experiment modifiers to delivery tuning", () => {
    const assignment = getAmyVoiceExperimentAssignment();
    const mods = getAmyVoiceExperimentModifiers(assignment);
    expect(mods.encouragementMultiplier).toBeGreaterThan(1);
    expect(mods.pacingRateDelta).toBeLessThan(0);
    expect(mods.leadInStyle).toBe("conversational");
  });

  it("tracks experiment outcomes by variant", () => {
    const assignment = getAmyVoiceExperimentAssignment();
    recordAmyVoiceExperimentOutcome(assignment, {
      replayCount: 2,
      durationMs: 5000,
      fallback: true,
    });
    recordAmyVoiceExperimentOutcome(assignment, {
      replayCount: 1,
      durationMs: 2000,
      fallback: false,
    });

    const snapshot = getAmyVoiceExperimentSnapshot();
    expect(snapshot.assignment).toEqual(assignment);
    expect(snapshot.results.length).toBeGreaterThan(0);
    const pacing = snapshot.results.find((r) => r.experiment === "pacing");
    expect(pacing?.avgReplayCount).toBe(1.5);
    expect(pacing?.fallbackRate).toBe(0.5);
  });
});
