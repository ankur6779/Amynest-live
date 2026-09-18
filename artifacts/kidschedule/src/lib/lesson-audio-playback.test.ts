import { beforeEach, describe, expect, it, vi } from "vitest";

const playPreparedUrlMock = vi.fn();
const fetchBlobUrlMock = vi.fn();
const primeSpeechMock = vi.fn();
const unlockMock = vi.fn();
const keepAliveMock = vi.fn();
const adoptKeepAliveMock = vi.fn();

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
    primeLessonKeepAliveInUserGesture: (...args: unknown[]) => keepAliveMock(...args),
    adoptLessonKeepAliveForBlob: (...args: unknown[]) => adoptKeepAliveMock(...args),
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
    primeSpeechMock.mockReset();
    unlockMock.mockReset();
    keepAliveMock.mockReset();
    adoptKeepAliveMock.mockReset();
    playPreparedUrlMock.mockResolvedValue({ success: true, layer: "static" });
    fetchBlobUrlMock.mockResolvedValue("blob:lesson-default");
    const { __resetLessonAudioWarmCacheForTests } = await import("@/lib/lesson-audio-playback");
    __resetLessonAudioWarmCacheForTests();
  });

  it("plays mapped lesson text via blob URL, never HTTPS", async () => {
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
      "blob:lesson-default",
      expect.objectContaining({
        source: "lesson",
        phrase: identity.text,
        srcType: "static",
        playbackRate: 1.1,
        waitUntilEnd: true,
        preferDirectStream: true,
      }),
    );
    const playedUrl = playPreparedUrlMock.mock.calls[0]?.[0] as string;
    expect(playedUrl.startsWith("https://")).toBe(false);
    expect(playedUrl.startsWith("/api/")).toBe(false);
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

  it("fails closed when the blob cannot be warmed", async () => {
    fetchBlobUrlMock.mockResolvedValue(null);
    const { playLessonParagraphStatic } = await import("@/lib/lesson-audio-playback");
    const res = await playLessonParagraphStatic({
      lessonId: "lesson-1",
      paragraphIdx: 0,
      text: "First paragraph of the lesson.",
      hash: "no-blob",
    });
    expect(res).toEqual({ success: false, error: "static_blob_unavailable", layer: "static" });
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
    expect(keepAliveMock).not.toHaveBeenCalled();
    expect(adoptKeepAliveMock).toHaveBeenCalledWith("blob:lesson-warm");

    const res = await mod.playLessonParagraphStatic(identity);
    expect(res.success).toBe(true);
    expect(playPreparedUrlMock).toHaveBeenCalledWith(
      "blob:lesson-warm",
      expect.objectContaining({ source: "lesson" }),
    );
  });

  it("primes keep-alive instead of HTTPS when the blob is not ready", async () => {
    let resolveBlob!: (value: string | null) => void;
    fetchBlobUrlMock.mockReturnValue(
      new Promise<string | null>((resolve) => {
        resolveBlob = resolve;
      }),
    );
    const mod = await import("@/lib/lesson-audio-playback");
    const identity = {
      lessonId: "toddler-potty-readiness",
      paragraphIdx: 0,
      text: "Potty training fails most often when the child is not yet ready.",
      hash: "keepalive-hash",
    };

    const primed = mod.primeLessonParagraphInUserGesture(identity);
    expect(primed).toBe(mod.LESSON_PLAY_KEEPALIVE);
    expect(keepAliveMock).toHaveBeenCalled();
    expect(primeSpeechMock).not.toHaveBeenCalled();

    const playP = mod.playLessonParagraphStatic(identity);
    resolveBlob("blob:late-warm");
    const res = await playP;

    expect(res.success).toBe(true);
    expect(adoptKeepAliveMock).toHaveBeenCalledWith("blob:late-warm");
    expect(playPreparedUrlMock).toHaveBeenCalledWith(
      "blob:late-warm",
      expect.objectContaining({ source: "lesson" }),
    );
    const playedUrl = playPreparedUrlMock.mock.calls[0]?.[0] as string;
    expect(playedUrl.includes("static-audio")).toBe(false);
  });

  it("keeps sibling paragraph blobs independently", async () => {
    fetchBlobUrlMock
      .mockResolvedValueOnce("blob:p0")
      .mockResolvedValueOnce("blob:p1");
    const mod = await import("@/lib/lesson-audio-playback");
    const p0 = {
      lessonId: "toddler-potty-readiness",
      paragraphIdx: 0,
      text: "Paragraph zero.",
      hash: "hash-p0",
    };
    const p1 = {
      lessonId: "toddler-potty-readiness",
      paragraphIdx: 1,
      text: "Paragraph one.",
      hash: "hash-p1",
    };
    await mod.ensureLessonParagraphWarmed(p0, 1000);
    await mod.ensureLessonParagraphWarmed(p1, 1000);

    expect(mod.primeLessonParagraphInUserGesture(p0)).toBe("blob:p0");
    expect(mod.primeLessonParagraphInUserGesture(p1)).toBe("blob:p1");
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
