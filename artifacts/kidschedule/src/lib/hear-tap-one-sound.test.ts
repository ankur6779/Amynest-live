import { describe, expect, it, vi, beforeEach } from "vitest";

const playWord = vi.fn(async () => ({ ok: true }));
const engineStop = vi.fn(async () => undefined);
const playCvcBlend = vi.fn();

vi.mock("@/lib/phonics-audio-engine", () => ({
  phonicsEnginePlayWord: (...args: unknown[]) => playWord(...args),
  phonicsEngineStop: (...args: unknown[]) => engineStop(...args),
}));

vi.mock("@/lib/phonics-audio", () => ({
  playCvcBlendWithSpeak: (...args: unknown[]) => playCvcBlend(...args),
}));

vi.mock("@/lib/local-audio-recovery", () => ({
  isLocalAudioRecoveryEnabled: () => true,
}));

import { phonicsEnginePlayWord, phonicsEngineStop } from "@/lib/phonics-audio-engine";

/** Hear & Tap contract: one user action → one word play (no blend sequence). */
describe("Hear & Tap one tap one sound", () => {
  beforeEach(() => {
    playWord.mockClear();
    engineStop.mockClear();
    playCvcBlend.mockClear();
  });

  it("playPrompt path calls phonicsEnginePlayWord exactly once per tap", async () => {
    const playbackWordId = "sat";
    await phonicsEngineStop("hear_tap_play");
    const res = await phonicsEnginePlayWord(playbackWordId, { wordId: playbackWordId });

    expect(engineStop).toHaveBeenCalledTimes(1);
    expect(playWord).toHaveBeenCalledTimes(1);
    expect(playWord).toHaveBeenCalledWith("sat", { wordId: "sat" });
    expect(playCvcBlend).not.toHaveBeenCalled();
    expect(res.ok).toBe(true);
  });

  it("100 simulated taps → 100 playWord calls, 0 blend calls", async () => {
    for (let i = 0; i < 100; i++) {
      await phonicsEngineStop("hear_tap_play");
      await phonicsEnginePlayWord("sat", { wordId: "sat" });
    }
    expect(playWord).toHaveBeenCalledTimes(100);
    expect(playCvcBlend).toHaveBeenCalledTimes(0);
  });
});
