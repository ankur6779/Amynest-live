import { describe, expect, it, vi, beforeEach } from "vitest";

const mockLookup = vi.fn((text: string) => `/api/static-audio/${text.replace(/\s+/g, "-")}.mp3`);
const mockPreloadPhrases = vi.fn();
const mockPrefetchBatch = vi.fn();
const mockWarmLocal = vi.fn();
const mockListPhonics = vi.fn(() => [
  {
    catalogKey: "letter:a",
    url: "/api/phonics-library/a.mp3",
    memoryCacheKey: "phonics:a",
    localCacheKey: "phonics:a",
    tier: 1,
    type: "letter",
  },
  {
    catalogKey: "cvc:cat",
    url: "/api/phonics-library/cat.mp3",
    memoryCacheKey: "phonics:content:cvc:cat",
    localCacheKey: "phonics:content:cvc:cat",
    tier: 2,
    type: "cvc",
  },
]);

vi.mock("@/lib/static-audio", () => ({
  lookupStaticAudioUrl: (...args: unknown[]) => mockLookup(...args),
  preloadStaticPhrases: (...args: unknown[]) => mockPreloadPhrases(...args),
  prefetchStaticAudioUrlsBatch: (...args: unknown[]) => mockPrefetchBatch(...args),
}));

vi.mock("@/lib/local-tts-cache", () => ({
  warmLocalCacheFromUrl: (...args: unknown[]) => mockWarmLocal(...args),
}));

vi.mock("@/lib/phonics-audio-map", () => ({
  listPhonicsLibraryPrewarmItems: () => mockListPhonics(),
}));

vi.mock("@/lib/api", () => ({
  resolveApiMediaUrl: (url: string) => url,
}));

describe("app-audio-prefetch", () => {
  beforeEach(() => {
    vi.resetModules();
    mockLookup.mockClear();
    mockPreloadPhrases.mockClear();
    mockPrefetchBatch.mockClear();
    mockWarmLocal.mockClear();
    mockListPhonics.mockClear();
  });

  it("collects catalog-backed boot phrases up to the limit", async () => {
    const mod = await import("@/lib/app-audio-prefetch");
    const phrases = mod.getAppBootWarmupPhrases();
    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.length).toBeLessThanOrEqual(mod.APP_BOOT_PREFETCH_LIMIT);
    expect(mockLookup).toHaveBeenCalled();
  });

  it("warmAppBootStaticPhrases runs once and prefetches batch + SW message", async () => {
    const postMessage = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: { postMessage }, addEventListener: vi.fn() },
    });

    const mod = await import("@/lib/app-audio-prefetch");
    mod.warmAppBootStaticPhrases();
    mod.warmAppBootStaticPhrases();

    expect(mockPreloadPhrases).toHaveBeenCalledTimes(1);
    expect(mockPrefetchBatch).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PRECACHE_AUDIO_URLS" }),
    );
  });

  it("warmPhonicsRouteOnOpen prefetches tier-1/2 letters and CVC", async () => {
    const mod = await import("@/lib/app-audio-prefetch");
    mod.warmPhonicsRouteOnOpen();
    mod.warmPhonicsRouteOnOpen();

    expect(mockPrefetchBatch).toHaveBeenCalledWith([
      "/api/phonics-library/a.mp3",
      "/api/phonics-library/cat.mp3",
    ]);
    expect(mockWarmLocal).toHaveBeenCalledWith("phonics:a", "/api/phonics-library/a.mp3");
  });
});
