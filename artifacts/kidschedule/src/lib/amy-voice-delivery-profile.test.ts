import { describe, expect, it, beforeEach } from "vitest";
import {
  recordAmyVoiceDeliveryOutcome,
  resolveAmyVoiceDeliveryProfile,
  resetAmyVoiceDeliveryProfileSession,
} from "./amy-voice-delivery-profile";
import { resetAmyVoiceExperimentsForTests, setAmyVoiceExperimentAssignmentForTests } from "./amy-voice-experiments";
import { resetAmyVoiceCohortSession } from "./amy-voice-cohorts";

describe("amy-voice-delivery-profile", () => {
  beforeEach(() => {
    resetAmyVoiceDeliveryProfileSession();
    resetAmyVoiceCohortSession();
    resetAmyVoiceExperimentsForTests();
    setAmyVoiceExperimentAssignmentForTests({
      encouragement_frequency: "control",
      pacing: "control",
      instruction_style: "control",
    });
  });

  it("merges cohort and experiment modifiers", () => {
    setAmyVoiceExperimentAssignmentForTests({
      encouragement_frequency: "frequent",
      pacing: "slower",
      instruction_style: "direct",
    });

    const profile = resolveAmyVoiceDeliveryProfile({
      replayCount: 3,
      difficulty: "struggling",
    });

    expect(profile.cohortId).toContain("struggling");
    expect(profile.modifiers.encouragementMultiplier).toBeGreaterThan(1);
    expect(profile.modifiers.pacingRateDelta).toBeLessThan(0);
    expect(profile.guidanceTier).toBe("full");
  });

  it("records delivery outcomes after speak", () => {
    const profile = resolveAmyVoiceDeliveryProfile({
      replayCount: 2,
      difficulty: "neutral",
    });
    recordAmyVoiceDeliveryOutcome(profile, {
      replayCount: 2,
      difficulty: "neutral",
      durationMs: 3200,
      fallback: false,
    });

    expect(profile.experimentVariants.encouragement_frequency).toBeDefined();
  });
});
