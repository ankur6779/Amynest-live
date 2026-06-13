import { describe, it, expect, vi, beforeEach } from "vitest";
import { playInfantSleepBundledMp3 } from "@/lib/infant-sleep-bundled-playback";

const playMock = vi.fn();

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    create: (url: string) => new Audio(url),
    play: (...args: unknown[]) => playMock(...args),
  },
}));

vi.mock("@/lib/tts-guard", () => ({
  configureMobileAudioElement: vi.fn(),
  isAudioUnlocked: () => true,
  recordTtsUserGesture: vi.fn(),
}));

vi.mock("@/lib/mic-permission-capacitor", () => ({
  prepareIosAudioSessionForPlayback: vi.fn().mockResolvedValue(undefined),
}));

describe("playInfantSleepBundledMp3", () => {
  beforeEach(() => {
    playMock.mockReset();
    playMock.mockResolvedValue(true);
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof requestAnimationFrame;
  });

  it("uses UI channel infant_sleep_mp3 meta (not static/TTS)", async () => {
    const audio = new Audio();
    const ok = await playInfantSleepBundledMp3(
      "/infant-sleep-audio/packs/core-v1/lullabies/twinkle.mp3",
      audio,
      { loop: true, volume: 0.7 },
    );
    expect(ok).toBe(true);
    expect(playMock).toHaveBeenCalledTimes(1);
    const meta = playMock.mock.calls[0]![1] as Record<string, unknown>;
    const opts = playMock.mock.calls[0]![2] as Record<string, unknown>;
    expect(meta.source).toBe("infant_sleep_mp3");
    expect(meta.channel).toBe("ui");
    expect(meta.srcType).toBeUndefined();
    expect(opts.channel).toBe("ui");
  });
});
