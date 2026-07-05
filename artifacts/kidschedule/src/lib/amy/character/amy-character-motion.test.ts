import { describe, expect, it } from "vitest";
import { resolveAmyMouthFrame, timerFallbackMouthFrame } from "./amy-character-motion";

describe("amy-character-motion", () => {
  it("hard-selects mouth frame from volume (no opacity blending)", () => {
    const result = resolveAmyMouthFrame({
      nowMs: 1000,
      volume: 50,
      meterLive: true,
      listenForAudio: true,
      speaking: true,
      useTimerFallback: false,
      mouthState: { lastSpeechAtMs: 0, frame: 0 },
    });
    expect(result.frame).toBe(2);
  });

  it("cycles timer fallback frames in order", () => {
    expect(timerFallbackMouthFrame(0)).toBe(0);
    expect(timerFallbackMouthFrame(34)).toBe(1);
    expect(timerFallbackMouthFrame(68)).toBe(2);
    expect(timerFallbackMouthFrame(102)).toBe(1);
  });
});
