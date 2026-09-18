import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLessonPlayback } from "@/hooks/use-lesson-playback";

const speakMock = vi.fn().mockResolvedValue({ success: true, layer: "static" });
const pauseMock = vi.fn();
const prefetchMock = vi.fn();
const playLessonStaticMock = vi.fn().mockResolvedValue({ success: true, layer: "static" });
const pausePreserveMock = vi.fn(() => 6.4);
const hasResumableMock = vi.fn(() => false);
const resumePreserveMock = vi.fn(async () => true);
const resetToStartMock = vi.fn(() => 0);

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
  primeLessonParagraphInUserGesture: vi.fn(() => null),
}));

vi.mock("@/lib/audio-manager", () => ({
  audioManager: {
    unlockFromUserGesture: vi.fn(),
    pauseSpeechPreservePosition: (...args: unknown[]) => pausePreserveMock(...args),
    hasResumableSpeech: () => hasResumableMock(),
    resumeSpeechPreservePosition: (...args: unknown[]) => resumePreserveMock(...args),
    resetSpeechToStart: (...args: unknown[]) => resetToStartMock(...args),
  },
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
    pausePreserveMock.mockClear();
    hasResumableMock.mockReset();
    hasResumableMock.mockReturnValue(false);
    resumePreserveMock.mockClear();
    resumePreserveMock.mockResolvedValue(true);
    resetToStartMock.mockClear();
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

  it("pause preserves position and Play resumes without restarting the paragraph", async () => {
    playLessonStaticMock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["P0", "P1"],
        lessonId: "lesson-pause-resume",
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
    expect(playLessonStaticMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.pause();
    });
    expect(pausePreserveMock).toHaveBeenCalled();
    expect(pauseMock).not.toHaveBeenCalled();
    expect(result.current.intent).toBe("paused");

    hasResumableMock.mockReturnValue(true);
    act(() => {
      result.current.play();
    });
    expect(result.current.intent).toBe("playing");
    expect(resumePreserveMock).toHaveBeenCalled();
    expect(playLessonStaticMock).toHaveBeenCalledTimes(1);
  });

  it("stop resets to 0 and the next Play starts from the beginning", () => {
    playLessonStaticMock.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["P0"],
        lessonId: "lesson-stop",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
      }),
    );

    act(() => {
      result.current.play();
    });
    act(() => {
      result.current.stop();
    });
    expect(resetToStartMock).toHaveBeenCalled();
    expect(result.current.intent).toBe("idle");

    hasResumableMock.mockReturnValue(true);
    act(() => {
      result.current.play();
    });
    expect(resumePreserveMock).not.toHaveBeenCalled();
    expect(playLessonStaticMock).toHaveBeenCalledTimes(2);
  });

  it("pause then a React rerender still resumes without restarting", async () => {
    playLessonStaticMock.mockImplementation(() => new Promise(() => {}));
    const { result, rerender } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["P0"],
        lessonId: "lesson-rerender",
        voiceId: "voice",
        modelId: "model",
        autoPlay: false,
      }),
    );

    act(() => {
      result.current.play();
    });
    act(() => {
      result.current.pause();
    });
    expect(result.current.intent).toBe("paused");

    rerender();
    expect(result.current.intent).toBe("paused");
    expect(playLessonStaticMock).toHaveBeenCalledTimes(1);

    hasResumableMock.mockReturnValue(true);
    act(() => {
      result.current.play();
    });
    expect(resumePreserveMock).toHaveBeenCalledTimes(1);
    expect(playLessonStaticMock).toHaveBeenCalledTimes(1);
  });

  it("pause stops voice and clears playing intent", () => {
    playLessonStaticMock.mockImplementation(() => new Promise(() => {}));
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

    expect(pausePreserveMock).toHaveBeenCalled();
    expect(pauseMock).not.toHaveBeenCalled();
    expect(result.current.intent).toBe("paused");
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

  it("stops playback when static playback fails instead of falling back to speak", async () => {
    playLessonStaticMock.mockResolvedValueOnce({
      success: false,
      error: "play_failed",
      layer: "static",
    });

    const { result } = renderHook(() =>
      useLessonPlayback({
        paragraphs: ["First paragraph.", "Second paragraph."],
        lessonId: "lesson-static-fail",
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
      expect(result.current.playbackError).toBe("play_failed");
      expect(result.current.intent).toBe("idle");
      expect(result.current.paragraphIdx).toBe(0);
    });
    expect(speakMock).not.toHaveBeenCalled();
    expect(pauseMock).toHaveBeenCalled();
  });
});
