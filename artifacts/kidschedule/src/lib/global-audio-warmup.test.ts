import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/amy-voice-audio-diag", () => ({
  logAmyVoiceDiag: vi.fn(),
}));

vi.mock("@/lib/tts-guard", () => ({
  recordTtsUserGesture: vi.fn(),
}));

function makeMockAudio(src = "") {
  return {
    preload: "auto",
    readyState: 4,
    currentTime: 0,
    volume: 1,
    src,
    load: vi.fn(),
    pause: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    removeAttribute: vi.fn(),
  } as unknown as HTMLAudioElement;
}

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    create: vi.fn((url?: string) => makeMockAudio(url ?? "")),
    getCached: vi.fn((url: string) => makeMockAudio(url)),
  },
}));

vi.mock("@/lib/local-tts-cache", () => ({
  warmLocalCacheFromUrl: vi.fn(),
  localCacheKeyForPhrase: vi.fn((text: string, mode: string) => `phrase:${mode}:${text}`),
}));

vi.mock("@/lib/static-audio", () => ({
  lookupStaticAudioUrl: vi.fn((text: string) => `/static-audio/${text}.mp3`),
  prefetchStaticAudioUrl: vi.fn(),
}));

vi.mock("@/lib/phonics-static-audio", () => ({
  getPhonicsStaticAudioUrl: vi.fn((key: string) => `/phonics-audio/${key}.mp3`),
}));

vi.mock("@workspace/phonics-sounds", () => ({
  getPhonicsLetterCacheKey: vi.fn((key: string) => `phonics:${key}`),
}));

describe("global-audio-warmup", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function flushAsync(): Promise<void> {
    for (let i = 0; i < 8; i++) {
      await Promise.resolve();
    }
  }

  it("marks high-priority phonics as cached after init", async () => {
    const mod = await import("@/lib/global-audio-warmup");
    mod.initGlobalAudioWarmup();
    await flushAsync();
    expect(mod.isGlobalAudioCached("phonics:a")).toBe(true);
    expect(mod.isGlobalAudioCached("phonics:e")).toBe(true);
  });

  it("playAudioInstant replays cached audio without double-play errors", async () => {
    const mod = await import("@/lib/global-audio-warmup");
    mod.initGlobalAudioWarmup();
    await flushAsync();
    mod.playAudioInstant("phonics:a");
    mod.playAudioInstant("phonics:b");
    expect(mod.isGlobalAudioCached("phonics:a")).toBe(true);
  });

  it("warmSpeechCoach accepts predicted phrases", async () => {
    const mod = await import("@/lib/global-audio-warmup");
    mod.warmSpeechCoach(["cat", "ball"]);
    await vi.runAllTimersAsync();
    await flushAsync();
    expect(mod.isGlobalAudioCached("speech:cat")).toBe(true);
  });

  it("preloads all phonics keys including q, x, z in low-priority tier", async () => {
    const mod = await import("@/lib/global-audio-warmup");
    mod.initGlobalAudioWarmup();
    await vi.runAllTimersAsync();
    await flushAsync();
    expect(mod.isGlobalAudioCached("phonics:q")).toBe(true);
    expect(mod.isGlobalAudioCached("phonics:x")).toBe(true);
    expect(mod.isGlobalAudioCached("phonics:z")).toBe(true);
  });

  it("does not prime audio before user gesture", async () => {
    const { audioManager } = await import("@/lib/audio-manager");
    const mod = await import("@/lib/global-audio-warmup");
    mod.initGlobalAudioWarmup();
    await flushAsync();
    expect(vi.mocked(audioManager.getCached)).toHaveBeenCalled();
    const audio = vi.mocked(audioManager.getCached).mock.results[0]?.value as HTMLAudioElement;
    expect(audio.play).not.toHaveBeenCalled();
  });

  it("re-primes cached audio when tab becomes visible after gesture", async () => {
    const { audioManager } = await import("@/lib/audio-manager");
    const mod = await import("@/lib/global-audio-warmup");
    mod.installGlobalAudioWarmupOnGesture();

    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await flushAsync();
    await flushAsync();

    vi.mocked(audioManager.getCached).mock.results.forEach((result) => {
      vi.mocked((result.value as HTMLAudioElement).play).mockClear();
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    await flushAsync();

    const played = vi
      .mocked(audioManager.getCached)
      .mock.results.some((result) =>
        vi.mocked((result.value as HTMLAudioElement).play).mock.calls.length > 0,
      );
    expect(played).toBe(true);
  });

  it("debounces visibility re-prime within 2 seconds", async () => {
    const { audioManager } = await import("@/lib/audio-manager");
    const mod = await import("@/lib/global-audio-warmup");
    mod.installGlobalAudioWarmupOnGesture();

    window.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    await flushAsync();
    await flushAsync();

    vi.mocked(audioManager.getCached).mock.results.forEach((result) => {
      vi.mocked((result.value as HTMLAudioElement).play).mockClear();
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });

    const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
    document.dispatchEvent(new Event("visibilitychange"));
    await flushAsync();

    vi.mocked(audioManager.getCached).mock.results.forEach((result) => {
      vi.mocked((result.value as HTMLAudioElement).play).mockClear();
    });

    now.mockReturnValue(11_000);
    document.dispatchEvent(new Event("visibilitychange"));
    await flushAsync();

    const played = vi
      .mocked(audioManager.getCached)
      .mock.results.some((result) =>
        vi.mocked((result.value as HTMLAudioElement).play).mock.calls.length > 0,
      );
    expect(played).toBe(false);

    now.mockRestore();
  });
});
