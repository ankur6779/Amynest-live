import { describe, expect, it, beforeEach } from "vitest";
import {
  classifyAudioFailureReason,
  getAudioReliabilityDashboard,
  getFailureDashboard,
  getRootCauseReport,
  getSpeechCoachCacheHitRate,
  getTopFailureCauses,
  mapToAudioSourceLayer,
  recordSpeechCoachCacheOutcome,
  resetAudioReliabilityTelemetry,
  resolveAudioReliabilityModule,
  getLatencyReport,
  trackAudioPlayFailed,
  trackAudioPlayStarted,
  trackAudioRequest,
  traceAudioStep,
  replayFailedTrace,
} from "@/lib/audio-reliability-telemetry";

describe("audio-reliability-telemetry", () => {
  beforeEach(() => {
    resetAudioReliabilityTelemetry(true);
  });

  it("maps modules from speak options", () => {
    expect(resolveAudioReliabilityModule({ speakOpts: { coach: true } })).toBe("speech_coach");
    expect(resolveAudioReliabilityModule({ speakOpts: { parentHub: true } })).toBe("parent_hub");
    expect(resolveAudioReliabilityModule({ blending: true })).toBe("blending");
    expect(resolveAudioReliabilityModule({ phonics: true })).toBe("phonics");
  });

  it("maps source layers", () => {
    expect(mapToAudioSourceLayer("static")).toBe("STATIC_GCS");
    expect(mapToAudioSourceLayer("cache")).toBe("LOCAL_CACHE");
    expect(mapToAudioSourceLayer("api")).toBe("DYNAMIC_TTS");
    expect(mapToAudioSourceLayer("emergency_local")).toBe("FALLBACK");
    expect(mapToAudioSourceLayer(undefined, { bundled: true })).toBe("BUNDLED");
  });

  it("classifies failure reasons", () => {
    expect(classifyAudioFailureReason("PLAYBACK_BUSY")).toBe("PLAY_REJECTED");
    expect(classifyAudioFailureReason("USER_INTERACTION_REQUIRED")).toBe("AUTOPLAY_BLOCKED");
    expect(classifyAudioFailureReason("PLAYBACK_WATCHDOG")).toBe("PIPELINE_TIMEOUT");
    expect(classifyAudioFailureReason("static_failed")).toBe("SOURCE_NOT_FOUND");
    expect(classifyAudioFailureReason("fetch failed")).toBe("NETWORK_TIMEOUT");
    expect(classifyAudioFailureReason("media_error_4")).toBe("DECODE_ERROR");
    expect(classifyAudioFailureReason("tts_stale")).toBe("UNMOUNTED_DURING_PLAY");
    expect(classifyAudioFailureReason("focus_pause", { lifecycleInterrupt: true })).toBe(
      "AUDIO_FOCUS_LOST",
    );
  });

  it("computes dashboard success rate and failure breakdown", () => {
    const id1 = trackAudioRequest({ module: "speech_coach" });
    traceAudioStep(id1, "CACHE_HIT", "STATIC_GCS");
    trackAudioPlayStarted(id1, "STATIC_GCS");

    const id2 = trackAudioRequest({ module: "speech_coach" });
    trackAudioPlayFailed(id2, "PLAYBACK_WATCHDOG", "DYNAMIC_TTS");

    const dash = getAudioReliabilityDashboard().find((d) => d.module === "speech_coach");
    expect(dash?.requested).toBe(2);
    expect(dash?.playStarted).toBe(1);
    expect(dash?.playFailed).toBe(1);
    expect(dash?.successRate).toBe(50);

    const failures = getFailureDashboard();
    expect(failures.some((f) => f.failure_reason === "PIPELINE_TIMEOUT")).toBe(true);

    const top = getTopFailureCauses(5);
    expect(top[0]?.failure_reason).toBe("PIPELINE_TIMEOUT");

    const replay = replayFailedTrace(id2);
    expect(replay?.audio_trace_id).toBe(id2);
    expect(replay?.failed).toBe(true);
  });

  it("tracks speech coach cache hit rate and remediation", () => {
    recordSpeechCoachCacheOutcome("Good job!", true, "static");
    recordSpeechCoachCacheOutcome("Good job!", true, "cache");
    recordSpeechCoachCacheOutcome("Custom line", false, "dynamic");
    expect(getSpeechCoachCacheHitRate()).toBe(66.67);
    const report = getRootCauseReport();
    expect(report.speechCoachCacheHitRate).toBeLessThan(90);
    expect(report.remediation.some((r) => r.includes("Speech Coach cache"))).toBe(true);
  });

  it("latencyReport aggregates module stats", () => {
    const id = trackAudioRequest({ module: "phonics" });
    trackAudioPlayStarted(id, "STATIC_GCS");
    const report = getLatencyReport();
    expect(report.modules.some((m) => m.module === "phonics")).toBe(true);
    expect(report.queue_interruptions).toBeGreaterThanOrEqual(0);
    expect(report.targets.learning_zone).toBeDefined();
  });
});
