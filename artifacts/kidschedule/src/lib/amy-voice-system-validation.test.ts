/**
 * Cross-module TTS system validation — fallback safety, ownership, prefetch, RL, streaming.
 * Simulates failure/network scenarios that manual QA covers on device.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { amyVoiceController } from "@/lib/amy-voice-controller";
import {
  _resetPipelineLearningForTests,
  recordLayerOutcome,
  getRankedLearnableLayers,
} from "@/lib/amy-voice-pipeline-learning";
import {
  pipelineCacheKey,
} from "@/lib/amy-voice-pipeline-optimizer";
import {
  storePartialPrefetch,
  storeCompletePrefetch,
  takePartialPrefetch,
  playStreamingTts,
  STREAM_MIN_START_BYTES,
  TTFA_TARGET_MS,
} from "@/lib/amy-voice-stream-player";
import { _resetRlForTests, selectLayersWithRl, updateClientQ } from "@/lib/amy-voice-rl-learning";
import { useLessonPlayback } from "@/hooks/use-lesson-playback";

vi.mock("@/hooks/use-auth-fetch", () => ({
  useAuthFetch: () => vi.fn(),
}));

const speakMock = vi.fn();
const pauseMock = vi.fn();
const playLessonStaticMock = vi.fn();
let amyState = { speaking: false, loading: false, error: null as string | null };

vi.mock("@/hooks/use-amy-voice", () => ({
  useAmyVoice: () => ({
    speak: speakMock,
    pause: pauseMock,
    primeSpeakGesture: vi.fn(),
    speaking: amyState.speaking,
    loading: amyState.loading,
    error: amyState.error,
  }),
}));

vi.mock("@/lib/lesson-audio-playback", () => ({
  playLessonParagraphStatic: (...args: unknown[]) => playLessonStaticMock(...args),
}));

describe("TTS system validation", () => {
  beforeEach(() => {
    _resetPipelineLearningForTests();
    _resetRlForTests();
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    amyVoiceController.pause();
    speakMock.mockReset();
    pauseMock.mockReset();
    amyState = { speaking: false, loading: false, error: null };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("1. Controller — rapid tap / no overlap", () => {
    it("pause invalidates in-flight playback (see amy-voice-controller.test.ts for stale ids)", async () => {
      amyVoiceController.pause();
      expect(amyVoiceController.getSnapshot().status).toBe("idle");
    });
  });

  describe("2. Fallback chain — learning layer selection", () => {
    it("static wins after repeated static success (API disabled path)", () => {
      const key = pipelineCacheKey("cat", "phonics");
      for (let i = 0; i < 8; i++) {
        recordLayerOutcome(key, "static", true, 120);
      }
      for (let i = 0; i < 5; i++) {
        recordLayerOutcome(key, "api", false, 2000);
      }
      const ranked = getRankedLearnableLayers(key, {
        textLength: 3,
        shortText: true,
        lessonMode: false,
        phonics: false,
        catalogPlayback: false,
        deviceClass: "desktop",
        networkProfile: "fast",
        module: "phonics",
      });
      expect(ranked).toContain("static");
      expect(ranked[0]).toBe("static");
      expect(ranked.indexOf("api")).toBeGreaterThan(0);
    });
  });

  describe("3. Streaming — TTFA and prefetch", () => {
    it("complete prefetch enables instant replay without re-fetch", async () => {
      const key = "test:prefetch";
      const blob = new Blob([new Uint8Array(STREAM_MIN_START_BYTES + 512)], { type: "audio/mpeg" });
      storeCompletePrefetch(key, blob);

      const authFetch = vi.fn();
      const audioPlay = vi.spyOn(
        (await import("@/lib/audio-manager")).audioManager,
        "play",
      ).mockResolvedValue(true);

      const result = await playStreamingTts(authFetch, { text: "hello" }, {
        cacheKeyHint: key,
        playbackMode: "partial-ok",
      });
      expect(result.ok).toBe(true);
      expect(authFetch).not.toHaveBeenCalled();
      if (result.ok) {
        expect(result.metrics.ttfaMs).toBeLessThan(TTFA_TARGET_MS);
        expect(result.metrics.streamingUsed).toBe(false);
      }
      expect(takePartialPrefetch(key)).toBeNull();
      audioPlay.mockRestore();
    });

    it("streaming failure returns error for full-download fallback", async () => {
      const authFetch = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));
      const result = await playStreamingTts(authFetch, { text: "fail" }, {
        playbackMode: "partial-ok",
      });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("stream_failed");
    });
  });

  describe("4. RL — layer reuse improves over repetitions", () => {
    it("selectLayersWithRl prefers high-reward layer after training", () => {
      const context = {
        textLength: 5,
        shortText: true,
        lessonMode: false,
        phonics: false,
        catalogPlayback: false,
        deviceClass: "desktop" as const,
        networkProfile: "fast" as const,
        module: "default",
      };
      const bootstrap = { static: 0, cache: 0, api: 0, elevenlabs: 0 };

      for (let i = 0; i < 10; i++) {
        updateClientQ(context, "static", 0.9);
        updateClientQ(context, "api", -0.5);
      }

      vi.spyOn(Math, "random").mockReturnValue(0.99);

      const picks: string[] = [];
      for (let i = 0; i < 20; i++) {
        const { layers } = selectLayersWithRl(context, new Set(), bootstrap);
        picks.push(layers[0] ?? "none");
      }
      const staticCount = picks.filter((p) => p === "static").length;
      expect(staticCount).toBeGreaterThan(10);
      vi.restoreAllMocks();
    });
  });

  describe("5. Audio Lessons — paragraph chaining", () => {
    it("play starts paragraph; static playback advances; pause stops chain", async () => {
      playLessonStaticMock.mockResolvedValue({ success: true, layer: "static" });

      const onComplete = vi.fn();
      const { result } = renderHook(() =>
        useLessonPlayback({
          paragraphs: ["First paragraph.", "Second paragraph."],
          lessonId: "lesson-1",
          voiceId: "v1",
          modelId: "m1",
        }),
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(playLessonStaticMock).toHaveBeenCalledWith(
          expect.objectContaining({ text: "First paragraph.", paragraphIdx: 0 }),
          expect.any(Object),
        );
      });

      await waitFor(() => {
        expect(result.current.paragraphIdx).toBe(1);
      });

      act(() => {
        result.current.pause();
      });

      expect(pauseMock).toHaveBeenCalled();
      expect(result.current.intent).toBe("idle");
    });

    it("failed paragraph sets playbackError and stops (no silent hang)", async () => {
      playLessonStaticMock.mockResolvedValue({ success: false, error: "static_failed", layer: "static" });
      speakMock.mockResolvedValue({ success: false, error: "tts_no_audible_layer", layer: "text_visual" });

      const { result } = renderHook(() =>
        useLessonPlayback({
          paragraphs: ["Broken paragraph."],
          lessonId: "lesson-2",
          voiceId: "v1",
          modelId: "m1",
        }),
      );

      act(() => {
        result.current.play();
      });

      await waitFor(() => {
        expect(result.current.playbackError).toBe("tts_no_audible_layer");
        expect(result.current.intent).toBe("idle");
      });
      expect(pauseMock).toHaveBeenCalled();
    });
  });

  describe("6. Telemetry — no crash on failure", () => {
    it("logTtsPipeline and logTtsRL do not throw when console fails", async () => {
      const { logTtsPipeline, createPipelineTelemetry } = await import(
        "@/lib/amy-voice-pipeline-optimizer"
      );
      const { logTtsRL } = await import("@/lib/amy-voice-rl-learning");

      const orig = console.info;
      console.info = () => {
        throw new Error("console blocked");
      };

      const telemetry = createPipelineTelemetry("key", "static_first", {
        textLength: 5,
        shortText: true,
        lessonMode: false,
        phonics: false,
        catalogPlayback: false,
        deviceClass: "desktop",
        networkProfile: "fast",
        module: "default",
      });
      telemetry.recordTry("static", true, 100);
      expect(() => telemetry.finish("static", false, false)).not.toThrow();
      expect(() =>
        logTtsRL({
          context: {
            textLength: 5,
            shortText: true,
            lessonMode: false,
            phonics: false,
            catalogPlayback: false,
            deviceClass: "desktop",
            networkProfile: "fast",
            module: "default",
          },
          chosenLayer: "static",
          reward: 0.5,
          ttfaMs: 100,
          bufferingEvents: 0,
          success: true,
        }),
      ).not.toThrow();
      expect(() =>
        logTtsPipeline({
          cacheKey: "k",
          chosenStrategy: "static_first",
          layersTried: [],
          successLayer: "static",
          totalTime: 100,
          fallbackUsed: false,
          budgetExceeded: false,
          device: "desktop",
          network: "fast",
        }),
      ).not.toThrow();

      console.info = orig;
    });
  });
});
