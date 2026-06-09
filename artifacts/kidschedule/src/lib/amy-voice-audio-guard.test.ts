import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  GUARD_FAILURE_THRESHOLD,
  getGuardFailureCount,
  isSilentSpeakLayer,
  isStreamingTemporarilyDisabled,
  resetGuardFailures,
  shouldBypassAudioGuard,
  temporarilyDisableApiLayer,
  temporarilyDisableStreaming,
  trackGuardFailure,
} from "@/lib/amy-voice-audio-guard";
import { isTtsApiCircuitOpen } from "@/lib/amy-voice-circuit";

vi.mock("@/lib/emergency-audio", () => ({
  playNaturalSpeechSynthesis: vi.fn(async () => true),
  playPhonicsPlaceholderTone: vi.fn(async () => false),
}));

describe("amy-voice-audio-guard", () => {
  beforeEach(() => {
    resetGuardFailures();
    vi.useRealTimers();
  });

  it("isSilentSpeakLayer never treats layers as intentionally silent", () => {
    expect(isSilentSpeakLayer("text_visual")).toBe(false);
    expect(isSilentSpeakLayer("static")).toBe(false);
  });

  it("shouldBypassAudioGuard skips control-flow errors", () => {
    expect(shouldBypassAudioGuard("tts_stale")).toBe(true);
    expect(shouldBypassAudioGuard("playback_failed")).toBe(false);
  });

  it("trackGuardFailure opens circuit breakers after threshold", () => {
    for (let i = 0; i < GUARD_FAILURE_THRESHOLD - 1; i++) {
      trackGuardFailure();
    }
    expect(getGuardFailureCount()).toBe(GUARD_FAILURE_THRESHOLD - 1);
    expect(isTtsApiCircuitOpen()).toBe(false);
    expect(isStreamingTemporarilyDisabled()).toBe(false);

    trackGuardFailure();
    expect(getGuardFailureCount()).toBe(GUARD_FAILURE_THRESHOLD);
    expect(isTtsApiCircuitOpen()).toBe(true);
    expect(isStreamingTemporarilyDisabled()).toBe(true);
  });

  it("resetGuardFailures clears failure count and re-enables API/streaming", () => {
    for (let i = 0; i < GUARD_FAILURE_THRESHOLD; i++) {
      trackGuardFailure();
    }
    expect(isTtsApiCircuitOpen()).toBe(true);
    expect(isStreamingTemporarilyDisabled()).toBe(true);
    resetGuardFailures();
    expect(getGuardFailureCount()).toBe(0);
    expect(isTtsApiCircuitOpen()).toBe(false);
    expect(isStreamingTemporarilyDisabled()).toBe(false);
  });

  it("temporarilyDisableStreaming respects duration", () => {
    vi.useFakeTimers();
    temporarilyDisableStreaming(5000);
    expect(isStreamingTemporarilyDisabled()).toBe(true);
    vi.advanceTimersByTime(5001);
    expect(isStreamingTemporarilyDisabled()).toBe(false);
  });

  it("temporarilyDisableApiLayer opens API circuit", () => {
    temporarilyDisableApiLayer(10_000);
    expect(isTtsApiCircuitOpen()).toBe(true);
  });
});
