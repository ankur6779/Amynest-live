import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLessonPlayback } from "@/hooks/use-lesson-playback";

const speakMock = vi.fn().mockResolvedValue({ success: true, layer: "static" });
const pauseMock = vi.fn();
const prefetchMock = vi.fn();
const playLessonStaticMock = vi.fn().mockResolvedValue({ success: true, layer: "static" });

vi.mock("@/hooks/use-amy-voice", () => ({
  useAmyVoice: () => ({
    speaking: false,
    loading: false,
    error: null,
    speak: speakMock,
    pause: pauseMock,
    primeSpeakGesture: vi.fn(),
  }),
}));

vi.mock("@/lib/lesson-audio-playback", () => ({
  playLessonParagraphStatic: (...args: unknown[]) => playLessonStaticMock(...args),
}));

vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () => vi.fn(),
}));

vi.mock("@/lib/amy-voice-pipeline-optimizer", () => ({
  prefetchLessonParagraph: (...args: unknown[]) => prefetchMock(...args),
}));

vi.mock("@/lib/tts-guard", () => ({
  recordTtsUserGesture: vi.fn(),
}));

describe("useLessonPlayback lesson switch safety", () => {
  beforeEach(() => {
    speakMock.mockClear();
    pauseMock.mockClear();
    prefetchMock.mockClear();
    playLessonStaticMock.mockClear();
    playLessonStaticMock.mockResolvedValue({ success: true, layer: "static" });
  });

  it("starts Lesson B from its resume index without Lesson A carryover", () => {
    const lessonA = {
      lessonId: "lesson-a",
      paragraphs: ["A0", "A1", "A2", "A3"],
      initialParagraphIdx: 3,
    };
    const lessonB = {
      lessonId: "lesson-b",
      paragraphs: ["B0", "B1", "B2"],
      initialParagraphIdx: 1,
    };

    const { rerender } = renderHook(
      (props: typeof lessonA) =>
        useLessonPlayback({
          paragraphs: props.paragraphs,
          lessonId: props.lessonId,
          voiceId: "voice",
          modelId: "model",
          autoPlay: true,
          initialParagraphIdx: props.initialParagraphIdx,
        }),
      { initialProps: lessonA },
    );

    expect(playLessonStaticMock).toHaveBeenCalled();
    const firstCall = playLessonStaticMock.mock.calls.at(-1);
    expect(firstCall?.[0]).toMatchObject({
      lessonId: "lesson-a",
      paragraphIdx: 3,
      text: "A3",
    });

    playLessonStaticMock.mockClear();

    rerender(lessonB);

    expect(playLessonStaticMock).toHaveBeenCalled();
    const secondCall = playLessonStaticMock.mock.calls.at(-1);
    expect(secondCall?.[0]).toMatchObject({
      lessonId: "lesson-b",
      paragraphIdx: 1,
      text: "B1",
    });
  });

  it("passes audioIdentity on play after manual paragraph jump", () => {
    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["P0", "P1", "P2"],
        lessonId: "lesson-jump",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
        initialParagraphIdx: 0,
      }),
    );

    act(() => {
      result.current.jumpToParagraph(2);
    });

    act(() => {
      result.current.play();
    });

    const lastCall = playLessonStaticMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({
      lessonId: "lesson-jump",
      paragraphIdx: 2,
      text: "P2",
    });
  });

  it("pause stops voice and clears playing intent", () => {
    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["P0", "P1"],
        lessonId: "lesson-pause",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
        initialParagraphIdx: 0,
      }),
    );

    act(() => {
      result.current.play();
    });
    expect(result.current.intent).toBe("playing");

    act(() => {
      result.current.pause();
    });

    expect(pauseMock).toHaveBeenCalled();
    expect(result.current.intent).toBe("idle");
    expect(result.current.playbackError).toBeNull();
  });

  it("play prefetches the current paragraph before speak", () => {
    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["Warm me up"],
        lessonId: "lesson-prefetch",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
        initialParagraphIdx: 0,
      }),
    );

    act(() => {
      result.current.play();
    });

    expect(prefetchMock).toHaveBeenCalled();
    expect(prefetchMock.mock.calls[0]?.[0]).toMatchObject({
      lessonId: "lesson-prefetch",
      paragraphIdx: 0,
      text: "Warm me up",
    });
  });

  it("auto-advances to the next paragraph when static playback succeeds", async () => {
    playLessonStaticMock
      .mockResolvedValueOnce({ success: true, layer: "static" })
      .mockResolvedValueOnce({ success: true, layer: "static" });

    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["First paragraph.", "Second paragraph."],
        lessonId: "lesson-chain",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
        initialParagraphIdx: 0,
      }),
    );

    act(() => {
      result.current.play();
    });

    await vi.waitFor(() => {
      expect(result.current.paragraphIdx).toBe(1);
    });
    expect(playLessonStaticMock).toHaveBeenCalled();
    expect(speakMock).not.toHaveBeenCalled();
  });

  it("falls back to speak when static playback fails", async () => {
    playLessonStaticMock.mockResolvedValueOnce({ success: false, error: "play_failed", layer: "static" });
    speakMock.mockImplementation((_text: string, opts?: { onFinished?: () => void }) => {
      opts?.onFinished?.();
      return Promise.resolve({ success: true, layer: "emergency_local" });
    });

    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["First paragraph.", "Second paragraph."],
        lessonId: "lesson-fallback",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
        initialParagraphIdx: 0,
      }),
    );

    act(() => {
      result.current.play();
    });

    await vi.waitFor(() => {
      expect(speakMock).toHaveBeenCalled();
      expect(result.current.paragraphIdx).toBe(1);
    });
  });

  it("auto-advances to the next paragraph when speak fallback onFinished fires", async () => {
    playLessonStaticMock.mockResolvedValue({ success: false, error: "static_failed", layer: "static" });
    speakMock.mockImplementation((text: string, opts?: { onFinished?: () => void }) => {
      if (text === "First paragraph.") {
        opts?.onFinished?.();
      }
      return Promise.resolve({ success: true, layer: "emergency_local" });
    });

    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["First paragraph.", "Second paragraph."],
        lessonId: "lesson-chain",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
        initialParagraphIdx: 0,
      }),
    );

    act(() => {
      result.current.play();
    });

    await vi.waitFor(() => {
      expect(result.current.paragraphIdx).toBe(1);
    });
    expect(result.current.intent).toBe("playing");
    expect(speakMock).toHaveBeenCalledWith(
      "First paragraph.",
      expect.objectContaining({ lessonParagraph: true }),
    );
  });

  it("stops on early_completion instead of silently skipping paragraphs", async () => {
    playLessonStaticMock.mockResolvedValueOnce({ success: false, error: "static_failed", layer: "static" });
    speakMock.mockResolvedValue({ success: false, error: "early_completion", layer: "api" });

    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["First paragraph.", "Second paragraph.", "Third paragraph."],
        lessonId: "lesson-early",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
        initialParagraphIdx: 0,
      }),
    );

    act(() => {
      result.current.play();
    });

    await vi.waitFor(() => {
      expect(result.current.playbackError).toBe("early_completion");
      expect(result.current.intent).toBe("idle");
      expect(result.current.paragraphIdx).toBe(0);
    });
    expect(pauseMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalledTimes(1);
  });
});
