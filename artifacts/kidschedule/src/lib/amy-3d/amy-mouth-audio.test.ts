import { describe, expect, it } from "vitest";
import {
  AMY_MOUTH_SILENCE_MS,
  audioLevelToVolumePercent,
  mouthFrameToOpacities,
  resolveMouthFrameFromVolume,
  volumeToMouthFrame,
} from "./amy-mouth-audio";

describe("amy-mouth-audio", () => {
  it("maps volume thresholds to frames", () => {
    expect(volumeToMouthFrame(0)).toBe(0);
    expect(volumeToMouthFrame(14)).toBe(0);
    expect(volumeToMouthFrame(15)).toBe(1);
    expect(volumeToMouthFrame(39)).toBe(1);
    expect(volumeToMouthFrame(40)).toBe(2);
  });

  it("converts normalized level to percent", () => {
    expect(audioLevelToVolumePercent(0.42)).toBe(42);
  });

  it("returns closed after silence window", () => {
    const start = 1000;
    const during = resolveMouthFrameFromVolume(50, start, {
      lastSpeechAtMs: start - 500,
      frame: 0,
    });
    expect(during.frame).toBe(2);

    const silent = resolveMouthFrameFromVolume(0, start + AMY_MOUTH_SILENCE_MS, {
      lastSpeechAtMs: start,
      frame: 2,
    });
    expect(silent.frame).toBe(0);
  });

  it("maps frame to overlay opacities", () => {
    expect(mouthFrameToOpacities(1)).toEqual({ frame: 1, f1Opacity: 1, f2Opacity: 0 });
    expect(mouthFrameToOpacities(2)).toEqual({ frame: 2, f1Opacity: 0, f2Opacity: 1 });
  });
});
