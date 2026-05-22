import { describe, expect, it, beforeEach } from "vitest";
import {
  AMY_PERSONALITY_BASELINE,
  getAmyVoicePersonalitySnapshot,
  measureAmyVoicePersonalityDrift,
  resetAmyVoicePersonalitySession,
  softCorrectModifiersTowardBaseline,
  stabilizeAmyVoiceDeliveryModifiers,
} from "./amy-voice-personality";
import { AMY_VOICE_INVARIANTS } from "./amy-voice-invariants";
import type { AmyVoiceDeliveryModifiers } from "./amy-voice-delivery-profile";

const DRIFTED: AmyVoiceDeliveryModifiers = {
  encouragementMultiplier: 1.32,
  microHumanizeMultiplier: 1.18,
  pacingRateDelta: -0.055,
  pacingGapDelta: 65,
  leadInStyle: "conversational",
};

describe("amy-voice-personality", () => {
  beforeEach(() => {
    resetAmyVoicePersonalitySession();
  });

  it("defines Amy baseline personality bands narrower than invariants", () => {
    const baseline = AMY_PERSONALITY_BASELINE.modifiers;
    expect(baseline.encouragementMultiplier.min).toBeGreaterThanOrEqual(
      AMY_VOICE_INVARIANTS.minEncouragementMultiplier,
    );
    expect(baseline.encouragementMultiplier.max).toBeLessThanOrEqual(
      AMY_VOICE_INVARIANTS.maxEncouragementMultiplier,
    );
  });

  it("does not correct modifiers within baseline personality range", () => {
    const stable: AmyVoiceDeliveryModifiers = {
      encouragementMultiplier: 1.02,
      microHumanizeMultiplier: 0.98,
      pacingRateDelta: -0.01,
      pacingGapDelta: 8,
      leadInStyle: "control",
    };

    for (let i = 0; i < AMY_PERSONALITY_BASELINE.validation.validateEverySpeaks; i++) {
      const result = stabilizeAmyVoiceDeliveryModifiers(stable);
      expect(result.modifiers).toEqual(stable);
      expect(result.validation?.corrected ?? false).toBe(false);
    }
  });

  it("applies soft correction when session drift exceeds threshold", () => {
    const result = stabilizeAmyVoiceDeliveryModifiers(DRIFTED);
    expect(result.validation?.exceededThreshold).toBe(true);
    expect(result.validation?.corrected).toBe(true);
    expect(result.modifiers.encouragementMultiplier).toBeLessThan(DRIFTED.encouragementMultiplier);
    expect(result.modifiers.encouragementMultiplier).toBeGreaterThan(
      AMY_PERSONALITY_BASELINE.modifiers.encouragementMultiplier.target,
    );
  });

  it("keeps corrected modifiers within hard invariants", () => {
    const corrected = softCorrectModifiersTowardBaseline(DRIFTED, 0.25);
    expect(corrected.encouragementMultiplier).toBeLessThanOrEqual(
      AMY_VOICE_INVARIANTS.maxEncouragementMultiplier,
    );
    expect(corrected.pacingRateDelta).toBeGreaterThanOrEqual(
      AMY_VOICE_INVARIANTS.minPacingRateDelta,
    );
  });

  it("corrects gently rather than snapping to baseline", () => {
    const corrected = softCorrectModifiersTowardBaseline(DRIFTED, 0.16);
    expect(corrected.encouragementMultiplier).toBeGreaterThan(1.1);
    expect(corrected.encouragementMultiplier).toBeLessThan(DRIFTED.encouragementMultiplier);
  });

  it("validates at session start and tracks correction history", () => {
    const first = stabilizeAmyVoiceDeliveryModifiers(DRIFTED);
    expect(first.validation).not.toBeNull();

    const drift = measureAmyVoicePersonalityDrift(DRIFTED);
    expect(drift.driftScore).toBeGreaterThan(0);

    for (let i = 0; i < 20; i++) {
      stabilizeAmyVoiceDeliveryModifiers(DRIFTED);
    }

    const snapshot = getAmyVoicePersonalitySnapshot();
    expect(snapshot.sessionSpeakCount).toBeGreaterThan(1);
    expect(snapshot.correctionCount).toBeGreaterThan(0);
    expect(snapshot.lastValidation?.corrected).toBe(true);
  });
});
