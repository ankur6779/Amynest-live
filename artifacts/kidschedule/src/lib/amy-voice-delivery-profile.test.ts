import { describe, expect, it, beforeEach } from "vitest";
import {
  applyAmyVoiceDeliveryModifiers,
  getAmyVoiceRuntimeSnapshot,
  recordAmyVoiceDeliveryOutcome,
  resolveAmyVoiceDeliveryProfile,
  resetAmyVoiceDeliveryProfileSession,
} from "./amy-voice-delivery-profile";
import { getProsodyProfile } from "./amy-speech-mode";
import { AMY_VOICE_INVARIANTS } from "./amy-voice-invariants";
import {
  getAmyVoiceExperimentSnapshot,
  recordExperimentOutcome,
  resetAmyVoiceExperimentsForTests,
  setAmyVoiceExperimentAssignmentForTests,
} from "./amy-voice-experiments";
import {
  evaluateExperimentGovernanceFromResults,
  EXPERIMENT_PROMOTION_RULES,
  getPromotedVariants,
  resetAmyVoiceGovernanceForTests,
} from "./amy-voice-governance";
import { resetAmyVoiceCohortSession } from "./amy-voice-cohorts";
import { resetAmyVoiceHealthMetrics } from "./amy-voice-health";
import { resetAmyVoiceAnalytics } from "./amy-voice-analytics";

describe("amy-voice-delivery-profile", () => {
  beforeEach(() => {
    resetAmyVoiceDeliveryProfileSession();
    resetAmyVoiceCohortSession();
    resetAmyVoiceGovernanceForTests();
    resetAmyVoiceExperimentsForTests();
    resetAmyVoiceHealthMetrics();
    resetAmyVoiceAnalytics();
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

  it("applies delivery modifiers within invariant bounds", () => {
    const base = getProsodyProfile("sentence", "let us read this sentence together", 1);
    const tuned = applyAmyVoiceDeliveryModifiers(base, {
      encouragementMultiplier: 2,
      microHumanizeMultiplier: 1.5,
      pacingRateDelta: -0.06,
      pacingGapDelta: 70,
      leadInStyle: "conversational",
    });

    expect(tuned.playbackRate).toBeGreaterThanOrEqual(AMY_VOICE_INVARIANTS.minPlaybackRate);
    expect(tuned.playbackRate).toBeLessThanOrEqual(AMY_VOICE_INVARIANTS.maxPlaybackRate);
    expect(tuned.phraseGapMs).toBeLessThanOrEqual(760);
  });

  it("merges promoted variants into live delivery profile without reload", () => {
    const assignment = {
      encouragement_frequency: "frequent" as const,
      pacing: "control" as const,
      instruction_style: "control" as const,
    };

    for (let window = 0; window < EXPERIMENT_PROMOTION_RULES.sustainedWindows; window++) {
      for (let i = 0; i < EXPERIMENT_PROMOTION_RULES.minSamplePerWindow; i++) {
        setAmyVoiceExperimentAssignmentForTests({ ...assignment, encouragement_frequency: "control" });
        recordExperimentOutcome(
          { ...assignment, encouragement_frequency: "control" },
          { replayCount: 3, durationMs: 2500, fallback: true },
        );
        setAmyVoiceExperimentAssignmentForTests({ ...assignment, encouragement_frequency: "frequent" });
        recordExperimentOutcome(
          { ...assignment, encouragement_frequency: "frequent" },
          { replayCount: 1, durationMs: 2500, fallback: false },
        );
      }
      evaluateExperimentGovernanceFromResults(getAmyVoiceExperimentSnapshot().results);
    }

    expect(getPromotedVariants().encouragement_frequency).toBe("frequent");
    const profile = resolveAmyVoiceDeliveryProfile({
      replayCount: 1,
      difficulty: "neutral",
    });
    expect(profile.experimentVariants.encouragement_frequency).toBe("frequent");
    expect(profile.modifiers.encouragementMultiplier).toBeGreaterThan(1);
  });

  it("builds unified runtime snapshot", async () => {
    const profile = resolveAmyVoiceDeliveryProfile({
      replayCount: 2,
      difficulty: "struggling",
    });
    recordAmyVoiceDeliveryOutcome(profile, {
      replayCount: 2,
      difficulty: "struggling",
      durationMs: 4100,
      fallback: false,
    });

    const snapshot = await getAmyVoiceRuntimeSnapshot();
    expect(snapshot.health).toBeDefined();
    expect(snapshot.analytics).toBeDefined();
    expect(snapshot.governance.promotionRules.minImprovementRatio).toBe(0.08);
    expect(snapshot.experiments.assignment).toBeDefined();
    expect(snapshot.deliveryProfile?.cohortId).toContain("struggling");
    expect(snapshot.invariants.enforced).toBe(true);
  });
});
