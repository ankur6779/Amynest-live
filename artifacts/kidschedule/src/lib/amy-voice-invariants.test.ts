import { describe, expect, it } from "vitest";
import { prepareAmySpeechInput } from "./amy-speech-mode";
import {
  AMY_VOICE_INVARIANTS,
  capInstructionPauses,
  clampDeliveryModifiersToInvariants,
  countInstructionPauses,
  enforceAmySpeechPolicyInvariants,
} from "./amy-voice-invariants";

describe("amy-voice-invariants", () => {
  it("blocks phonics fallback for sentence-like modes", () => {
    const policy = enforceAmySpeechPolicyInvariants(
      prepareAmySpeechInput("listen carefully and read the story"),
    );
    expect(policy.speechMode).toBe("speech_coach");
    expect(policy.allowPhonicsSequence).toBe(false);
    expect(policy.allowPhonicsFallback).toBe(false);
  });

  it("caps instruction pauses to invariant maximum", () => {
    const noisy = "one … two … three … four … five";
    expect(countInstructionPauses(noisy)).toBe(4);
    const capped = capInstructionPauses(noisy);
    expect(countInstructionPauses(capped)).toBeLessThanOrEqual(
      AMY_VOICE_INVARIANTS.maxInstructionPauses,
    );
  });

  it("clamps experiment modifiers inside tone and pacing bounds", () => {
    const clamped = clampDeliveryModifiersToInvariants({
      encouragementMultiplier: 2,
      microHumanizeMultiplier: 2,
      pacingRateDelta: -0.2,
      pacingGapDelta: 200,
      leadInStyle: "conversational",
    });
    expect(clamped.encouragementMultiplier).toBeLessThanOrEqual(
      AMY_VOICE_INVARIANTS.maxEncouragementMultiplier,
    );
    expect(clamped.pacingRateDelta).toBeGreaterThanOrEqual(
      AMY_VOICE_INVARIANTS.minPacingRateDelta,
    );
    expect(clamped.pacingGapDelta).toBeLessThanOrEqual(
      AMY_VOICE_INVARIANTS.maxPacingGapDelta,
    );
  });

  it("clamps prosody playback rates", () => {
    const policy = enforceAmySpeechPolicyInvariants({
      ...prepareAmySpeechInput("hello there"),
      prosody: {
        ...prepareAmySpeechInput("hello there").prosody,
        playbackRate: 1.5,
        synthesisRate: 0.5,
      },
    });
    expect(policy.prosody.playbackRate).toBeLessThanOrEqual(
      AMY_VOICE_INVARIANTS.maxPlaybackRate,
    );
    expect(policy.prosody.synthesisRate).toBeGreaterThanOrEqual(
      AMY_VOICE_INVARIANTS.minPlaybackRate,
    );
  });
});
