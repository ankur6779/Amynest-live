import { beforeEach, describe, expect, it, vi } from "vitest";

const playPreparedUrlMock = vi.fn();
const fetchBlobUrlMock = vi.fn();
const primeSpeechMock = vi.fn();
const unlockMock = vi.fn();

vi.mock("@/lib/amy-voice-controller", () => ({
  amyVoiceController: {
    playPreparedUrl: (...args: unknown[]) => playPreparedUrlMock(...args),
  },
}));

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    unlockFromUserGesture: (...args: unknown[]) => unlockMock(...args),
    primeSpeechUrlInUserGesture: (...args: unknown[]) => primeSpeechMock(...args),
    takeGesturePrimedElement: vi.fn(() => null),
  },
}));

vi.mock("@/lib/static-audio", () => ({
  lookupStaticAudioUrlStrict: vi.fn((text: string) =>
    text ? `/api/static-audio/mockhash.mp3` : null,
  ),
  isStaticAudioMapReady: () => true,
  ensureStaticAudioMapLoaded: vi.fn(() => Promise.resolve()),
  getLoadedStaticAudioCatalog: vi.fn(() => ({})),
  fetchStaticAudioObjectUrl: (...args: unknown[]) => fetchBlobUrlMock(...args),
}));

vi.mock("@/lib/api", () => ({
  resolveApiMediaUrl: (url: string) =>
    url.startsWith("http") || url.startsWith("blob:") ? url : `https://api.test${url}`,
}));

vi.mock("@/lib/static-audio-edge", () => ({
  isMobileStaticAudioDevice: () => false,
}));

vi.mock("@/lib/debug-audio-pipeline", () => ({
  logAudioPipeline: vi.fn(),
  setAudioPipelineContext: vi.fn(),
  setAudioPipelineMachineState: vi.fn(),
}));

describe("playLessonParagraphStatic", () => {
  beforeEach(async () => {
    playPreparedUrlMock.mockReset();
    fetchBlobUrlMock.mockReset();
    playPreparedUrlMock.mockResolvedValue({ success: true, layer: "static" });
    fetchBlobUrlMock.mockResolvedValue(null);
    const { __resetLessonAudioWarmCacheForTests } = await import("@/lib/lesson-audio-playback");
    __resetLessonAudioWarmCacheForTests();
  });

  it("plays mapped lesson text via playPreparedUrl and waits until end", async () => {
    const { playLessonParagraphStatic } = await import("@/lib/lesson-audio-playback");
    const identity = {
      lessonId: "lesson-1",
      paragraphIdx: 0,
      text: "First paragraph of the lesson.",
      hash: "abc",
    };

    const res = await playLessonParagraphStatic(identity, { playbackRate: 1.1 });

    expect(res.success).toBe(true);
    expect(playPreparedUrlMock).toHaveBeenCalledWith(
      "https://api.test/api/static-audio/mockhash.mp3",
      expect.objectContaining({
        source: "lesson",
        phrase: identity.text,
        srcType: "static",
        playbackRate: 1.1,
        waitUntilEnd: true,
        preferDirectStream: true,
      }),
    );
  });

  it("returns static_failed when catalog has no URL", async () => {
    const { lookupStaticAudioUrlStrict } = await import("@/lib/static-audio");
    vi.mocked(lookupStaticAudioUrlStrict).mockReturnValueOnce(null);

    const { playLessonParagraphStatic } = await import("@/lib/lesson-audio-playback");
    const res = await playLessonParagraphStatic({
      lessonId: "lesson-1",
      paragraphIdx: 0,
      text: "Missing line.",
      hash: "abc",
    });

    expect(res).toEqual({ success: false, error: "static_failed", layer: "static" });
    expect(playPreparedUrlMock).not.toHaveBeenCalled();
  });

  it("uses warmed blob URL when available", async () => {
    fetchBlobUrlMock.mockResolvedValue("blob:lesson-warm");
    const mod = await import("@/lib/lesson-audio-playback");
    const identity = {
      lessonId: "lesson-1",
      paragraphIdx: 0,
      text: "First paragraph of the lesson.",
      hash: "warm-hash",
    };

    await mod.ensureLessonParagraphWarmed(identity, 1000);
    const res = await mod.playLessonParagraphStatic(identity);

    expect(res.success).toBe(true);
    expect(playPreparedUrlMock).toHaveBeenCalledWith(
      "blob:lesson-warm",
      expect.objectContaining({ preferDirectStream: true, source: "lesson" }),
    );
  });

  it("primeLessonParagraphInUserGesture prefers warmed blob over HTTPS proxy", async () => {
    primeSpeechMock.mockReset();
    unlockMock.mockReset();
    fetchBlobUrlMock.mockResolvedValue("blob:lesson-warm");
    const mod = await import("@/lib/lesson-audio-playback");
    const identity = {
      lessonId: "lesson-1",
      paragraphIdx: 0,
      text: "First paragraph of the lesson.",
      hash: "gesture-hash",
    };

    await mod.ensureLessonParagraphWarmed(identity, 1000);
    const url = mod.primeLessonParagraphInUserGesture(identity);

    expect(url).toBe("blob:lesson-warm");
    expect(unlockMock).toHaveBeenCalled();
    expect(primeSpeechMock).toHaveBeenCalledWith(
      "blob:lesson-warm",
      expect.objectContaining({ keepPlaying: true, volume: 1 }),
    );

    const res = await mod.playLessonParagraphStatic(identity);
    expect(res.success).toBe(true);
    expect(playPreparedUrlMock).toHaveBeenCalledWith(
      "blob:lesson-warm",
      expect.objectContaining({ source: "lesson" }),
    );
  });

  it("does not call live TTS when a static catalog URL exists", async () => {
    const { playLessonParagraphStatic } = await import("@/lib/lesson-audio-playback");
    const res = await playLessonParagraphStatic({
      lessonId: "toddler-tantrums-101",
      paragraphIdx: 0,
      text: "A tantrum is not bad behaviour.",
      hash: "abc",
    });
    expect(res.success).toBe(true);
    expect(playPreparedUrlMock).toHaveBeenCalledTimes(1);
    expect(playPreparedUrlMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ source: "lesson", srcType: "static" }),
    );
  });
});
