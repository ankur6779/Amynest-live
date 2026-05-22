import { describe, expect, it, beforeEach } from "vitest";
import {
  AMY_VOICE_SUCCESS_TARGETS,
  getAmyVoiceHealthSnapshot,
  recordAmyVoiceSpeakOutcome,
  resetAmyVoiceHealthMetrics,
} from "./amy-voice-health";
import {
  buildStaticAudioPriorities,
  getAmyVoiceAnalyticsSnapshot,
  getTopStrugglePhrases,
  recordAmyVoiceConfidenceCueUsage,
  recordAmyVoiceDifficultyTransition,
  recordAmyVoiceRecoveryUsage,
  recordAmyVoiceStrugglePhrase,
  resetAmyVoiceAnalytics,
} from "./amy-voice-analytics";

describe("amy-voice-health", () => {
  beforeEach(() => {
    resetAmyVoiceHealthMetrics();
  });

  it("tracks fallback rate and replay averages", () => {
    for (let i = 0; i < 5; i++) {
      recordAmyVoiceSpeakOutcome({
        speechMode: "sentence",
        layer: "api",
        replayCount: 1,
        durationMs: 1200,
        success: true,
      });
    }
    for (let i = 0; i < 5; i++) {
      recordAmyVoiceSpeakOutcome({
        speechMode: "math",
        layer: "emergency_local",
        replayCount: 3,
        durationMs: 4200,
        success: true,
      });
    }

    const snapshot = getAmyVoiceHealthSnapshot();
    expect(snapshot.totalSpeaks).toBe(10);
    expect(snapshot.fallbackRate).toBe(0.5);
    expect(snapshot.avgReplayCount).toBe(2);
    expect(snapshot.avgSessionDurationMs).toBe(2700);
    expect(snapshot.math.speaks).toBe(5);
    expect(snapshot.math.fallbackRate).toBe(1);
    expect(snapshot.math.highReplayRate).toBe(1);
    expect(snapshot.alerts.length).toBe(0);
    expect(snapshot.healthStatus).toBe("watch");
    expect(snapshot.meetsSuccessTargets).toBe(false);
  });

  it("does not alert until sustained rolling-window breaches", () => {
    for (let evalPass = 0; evalPass < 3; evalPass++) {
      for (let i = 0; i < 25; i++) {
        recordAmyVoiceSpeakOutcome({
          speechMode: "speech_coach",
          layer: "emergency_local",
          replayCount: 3,
          durationMs: 20_000,
          success: true,
        });
      }
    }

    const snapshot = getAmyVoiceHealthSnapshot();
    expect(snapshot.rollingWindow.sampleSize).toBe(40);
    expect(snapshot.rollingWindow.fallbackRate).toBe(1);
    expect(snapshot.alerts.length).toBeGreaterThan(0);
    expect(snapshot.alerts[0]?.sustainedBreaches).toBeGreaterThanOrEqual(3);
    expect(snapshot.healthStatus).toBe("critical");
  });

  it("reports healthy when rolling metrics meet success targets", () => {
    for (let evalPass = 0; evalPass < 3; evalPass++) {
      for (let i = 0; i < 30; i++) {
        recordAmyVoiceSpeakOutcome({
          speechMode: "sentence",
          layer: "api",
          replayCount: 1,
          durationMs: 1500,
          success: true,
        });
      }
    }

    const snapshot = getAmyVoiceHealthSnapshot();
    expect(snapshot.rollingWindow.fallbackRate).toBe(0);
    expect(snapshot.rollingWindow.avgReplayCount).toBe(1);
    expect(snapshot.meetsSuccessTargets).toBe(true);
    expect(snapshot.healthStatus).toBe("healthy");
    expect(snapshot.targets.maxFallbackRate).toBe(AMY_VOICE_SUCCESS_TARGETS.maxFallbackRate);
  });
});

describe("amy-voice-analytics", () => {
  beforeEach(() => {
    resetAmyVoiceAnalytics();
  });

  it("logs difficulty transitions, recovery, and confidence cues", () => {
    recordAmyVoiceDifficultyTransition("neutral", "struggling");
    recordAmyVoiceRecoveryUsage("struggling_support");
    recordAmyVoiceConfidenceCueUsage("You've got this");

    const snapshot = getAmyVoiceAnalyticsSnapshot();
    expect(snapshot.difficultyTransitions).toBe(1);
    expect(snapshot.lastDifficultyTransition).toEqual(
      expect.objectContaining({ from: "neutral", to: "struggling" }),
    );
    expect(snapshot.recoveryUsage).toBe(1);
    expect(snapshot.recoveryByContext.struggling_support).toBe(1);
    expect(snapshot.confidenceCueUsage).toBe(1);
    expect(snapshot.recentConfidenceCues).toEqual(["You've got this"]);
  });

  it("ranks top struggle phrases and static audio priorities", () => {
    recordAmyVoiceStrugglePhrase("sound out the word slowly", "speech_coach", "default", {
      replayCount: 3,
      difficulty: "struggling",
      fallback: true,
    });
    recordAmyVoiceStrugglePhrase("step three of five", "mixed", "default", {
      replayCount: 2,
      difficulty: "neutral",
    });

    const top = getTopStrugglePhrases(5);
    expect(top[0]?.text).toBe("sound out the word slowly");
    expect(top[0]?.score).toBeGreaterThan(top[1]?.score ?? 0);

    const priorities = buildStaticAudioPriorities(5);
    expect(priorities.length).toBeGreaterThan(0);
    expect(priorities[0]?.text).toBe("sound out the word slowly");
  });
});
