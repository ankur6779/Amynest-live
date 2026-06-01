import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/amy-voice-audio-diag", () => ({
  logAmyVoiceDiag: vi.fn(),
}));

vi.mock("@/lib/pregenerate-tts", () => ({
  pregenerateTtsTexts: vi.fn(),
}));

vi.mock("@/lib/global-audio-cache", () => ({
  deleteGlobalAudioCacheEntry: vi.fn(),
  getGlobalAudioCacheEntry: vi.fn(),
  globalAudioCacheKeys: vi.fn(() => [][Symbol.iterator]()),
  hasGlobalAudioCacheEntry: vi.fn(() => false),
  setGlobalAudioCacheEntry: vi.fn(),
}));

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    getCached: vi.fn(() => ({
      preload: "auto",
      readyState: 4,
      load: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  },
}));

vi.mock("@/lib/local-tts-cache", () => ({
  warmLocalCacheFromUrl: vi.fn(),
  localCacheKeyForPhrase: vi.fn((text: string) => `phrase:default:${text}`),
  deleteLocalCachedAudio: vi.fn(),
}));

vi.mock("@/lib/spelling-audio-map", () => ({
  lookupSpellingAudioUrl: vi.fn((word: string) =>
    word.toLowerCase() === "cat" ? "/api/spelling-library/spelling/v2/cat.mp3" : null,
  ),
  lookupSpellingAudioFallbackUrl: vi.fn(
    () => "/api/spelling-library/spelling/v2/cat.mp3",
  ),
}));

vi.mock("@/lib/static-audio", () => ({
  lookupStaticAudioUrl: vi.fn((text: string) =>
    text === "try again" ? "/api/static-audio/try-again.mp3" : `/static/${text}.mp3`,
  ),
  prefetchStaticAudioUrl: vi.fn(),
}));

vi.mock("@/lib/phonics-static-audio", () => ({
  getPhonicsStaticAudioUrl: vi.fn((key: string) => `/phonics/${key}.mp3`),
}));

vi.mock("@/lib/amy-voice-pipeline-learning", () => ({
  getPredictedNextKey: vi.fn(() => null),
  recordPhraseTransition: vi.fn(),
}));

describe("learning-zone-audio-prewarm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("builds stable cache keys from text + module state", async () => {
    const mod = await import("@/lib/learning-zone-audio-prewarm");
    const key = mod.buildLearningZoneAudioCacheKey(
      {
        module: "spelling",
        difficulty: "easy",
        ageGroup: "4-6",
        locale: "en",
      },
      "Cat",
    );
    expect(key).toContain("spelling");
    expect(key).toContain("cat");
  });

  it("schedules prewarm without throwing", async () => {
    const { pregenerateTtsTexts } = await import("@/lib/pregenerate-tts");
    const mod = await import("@/lib/learning-zone-audio-prewarm");
    const authFetch = vi.fn().mockResolvedValue({ ok: true });

    mod.scheduleLearningZoneAudioPrewarm(authFetch as never, {
      module: "smart_math_tricks",
      texts: ["Double a number by adding it to itself"],
      ageGroup: "4-6",
    });

    await vi.runAllTimersAsync();
    expect(pregenerateTtsTexts).toHaveBeenCalled();
  });

  it("uses static catalog for spelling feedback phrases instead of spelling fallback", async () => {
    const { warmLocalCacheFromUrl } = await import("@/lib/local-tts-cache");
    const mod = await import("@/lib/learning-zone-audio-prewarm");
    const authFetch = vi.fn().mockResolvedValue({ ok: true });

    mod.scheduleLearningZoneAudioPrewarm(authFetch as never, {
      module: "spelling",
      texts: ["cat"],
      ageGroup: "4-6",
    });

    await vi.runAllTimersAsync();

    const warmedUrls = vi
      .mocked(warmLocalCacheFromUrl)
      .mock.calls.map((call) => call[1]);
    expect(warmedUrls).toContain("/api/spelling-library/spelling/v2/cat.mp3");
    expect(warmedUrls).toContain("/api/static-audio/try-again.mp3");
    expect(
      warmedUrls.filter((url) => url === "/api/spelling-library/spelling/v2/cat.mp3"),
    ).toHaveLength(1);
  });
});
