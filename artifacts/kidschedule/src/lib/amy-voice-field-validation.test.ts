import { describe, expect, it, beforeEach } from "vitest";
import {
  AMY_VOICE_SUCCESS_TARGETS,
  resetAmyVoiceHealthMetrics,
} from "./amy-voice-health";
import { recordAmyVoiceStrugglePhrase, resetAmyVoiceAnalytics } from "./amy-voice-analytics";
import {
  resetAmyVoiceFieldValidationSession,
  runAmyVoiceFieldValidation,
} from "./amy-voice-field-validation";

describe("amy-voice-field-validation", () => {
  beforeEach(() => {
    resetAmyVoiceFieldValidationSession();
  });

  it("reports low-end device and degraded network context", () => {
    const report = runAmyVoiceFieldValidation({
      forceLowEndDevice: true,
      assumeDegradedNetwork: true,
    });
    expect(report.deviceTier).toBe("low");
    expect(report.networkProfile).toBe("degraded");
    expect(report.passed).toBe(true);
    expect(report.health.targets).toEqual(AMY_VOICE_SUCCESS_TARGETS);
  });

  it("recommends static audio for top struggle phrases", () => {
    recordAmyVoiceStrugglePhrase("sound out the word slowly", "speech_coach", "default", {
      replayCount: 4,
      difficulty: "struggling",
      fallback: true,
    });

    const report = runAmyVoiceFieldValidation();
    expect(report.analytics.topStrugglePhrases.length).toBe(1);
    expect(report.recommendations.some((r) => r.includes("static audio"))).toBe(true);
  });
});
