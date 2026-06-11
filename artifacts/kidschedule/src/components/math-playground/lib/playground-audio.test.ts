import { describe, expect, it, vi, beforeEach } from "vitest";

const getLearningZonePrewarmedAudio = vi.fn<() => HTMLAudioElement | null>(() => null);

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    play: vi.fn(async () => true),
    waitUntilEnd: vi.fn(async () => ({ ok: true })),
  },
}));

vi.mock("@/lib/learning-zone-audio-prewarm", () => ({
  buildLearningZoneAudioCacheKey: (_ctx: unknown, text: string) => `lz:mock:${text}`,
  buildLearningZoneAudioStateKey: (input: { module: string; ageGroup?: string }) =>
    `${input.module}|${input.ageGroup ?? ""}`,
  getLearningZonePrewarmedAudio: (...args: unknown[]) => getLearningZonePrewarmedAudio(...args),
}));

vi.mock("@/lib/static-audio", () => ({
  lookupStaticAudioUrl: vi.fn(() => null),
}));

vi.mock("@/lib/audio-hot-cache", () => ({
  recordHotCachePlay: vi.fn(),
}));

vi.mock("@/lib/unified-catalog-playback", () => ({
  catalogPlaybackSpeakOptions: (text: string) => ({
    catalogPlayback: true,
    staticCatalogTexts: [text],
    waitUntilEnd: true,
  }),
}));

vi.mock("./feature-flags", () => ({
  isMpVoiceModeEnabled: vi.fn(() => false),
}));

describe("playground-audio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLearningZonePrewarmedAudio.mockReturnValue(null);
  });

  it("builds stable math playground prewarm context", async () => {
    const { buildMathPlaygroundPrewarmContext } = await import("./playground-audio");
    const ctx = buildMathPlaygroundPrewarmContext("4-5");
    expect(ctx.module).toBe("math_playground");
    expect(ctx.ageGroup).toBe("4-5");
    expect(ctx.stateKey).toContain("math_playground");
  });

  it("plays prewarmed clip before falling back to speak", async () => {
    const audioManager = (await import("@/lib/audio-manager")).audioManager;
    const fakeAudio = { src: "/static/great.mp3", playbackRate: 1 } as HTMLAudioElement;
    getLearningZonePrewarmedAudio.mockReturnValue(fakeAudio);

    const speak = vi.fn(async () => ({ success: true }));
    const playPreparedUrl = vi.fn(async () => ({ success: true }));
    const { speakPlaygroundCue } = await import("./playground-audio");

    await speakPlaygroundCue("Great job!", "4-5", { speak, playPreparedUrl });

    expect(audioManager.play).toHaveBeenCalled();
    expect(audioManager.waitUntilEnd).toHaveBeenCalledWith(fakeAudio, expect.any(Function));
    expect(speak).not.toHaveBeenCalled();
    expect(playPreparedUrl).not.toHaveBeenCalled();
  });

  it("falls back to speak when no prewarm or static url", async () => {
    const speak = vi.fn(async () => ({ success: true }));
    const playPreparedUrl = vi.fn(async () => ({ success: true }));
    const { speakPlaygroundCue } = await import("./playground-audio");

    await speakPlaygroundCue("Let's count together.", "4-5", { speak, playPreparedUrl });

    expect(speak).toHaveBeenCalledWith(
      "Let's count together.",
      expect.objectContaining({ waitUntilEnd: true }),
    );
  });
});
