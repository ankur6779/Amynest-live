import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  LONG_TEXT_THRESHOLD,
  MAX_PIPELINE_TIME_MS,
  PipelineTimeBudget,
  createAdaptivePipelineBudget,
  isLayerRecentlyFailed,
  markLayerFailed,
  pipelineCacheKey,
  runStagedPregenRace,
  waitUntilEndWithCap,
} from "@/lib/amy-voice-pipeline-optimizer";
import { createAudioIdentity } from "@/lib/lesson-audio-identity";
import {
  _resetPipelineLearningForTests,
  recordLayerOutcome,
} from "@/lib/amy-voice-pipeline-learning";
import { resolvePipelineStrategy } from "@/lib/amy-voice-pipeline-optimizer";
import type { AmySpeechPolicy } from "@/lib/amy-speech-mode";

function basePolicy(overrides: Partial<AmySpeechPolicy> = {}): AmySpeechPolicy {
  return {
    originalText: "hello",
    normalizedText: "hello",
    phrases: ["hello"],
    pipelineMode: "default",
    speechMode: "default",
    preferDynamicTts: false,
    forcePhonicsOnly: false,
    useSemanticSplit: false,
    allowPhonicsFallback: false,
    allowPhonicsSequence: false,
    allowSpeechCoachSplit: false,
    preferSpeechSynthesisFallback: true,
    retryDynamicTts: false,
    dynamicTimeoutMs: 1500,
    learningPriority: 0,
    emotion: "neutral",
    intent: "neutral",
    difficultyLevel: "neutral",
    replayCount: 0,
    prosody: { playbackRate: 1, synthesisRate: 1 },
    ...overrides,
  };
}

describe("amy-voice-pipeline-optimizer", () => {
  beforeEach(() => {
    _resetPipelineLearningForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("pipelineCacheKey is stable for same text/mode", () => {
    const a = pipelineCacheKey("Hello world", "default");
    const b = pipelineCacheKey("hello world", "default");
    expect(a).toBe(b);
  });

  it("lesson pipelineCacheKey scopes by lesson id and paragraph index", () => {
    const text = "Same paragraph text for testing.";
    const id0 = createAudioIdentity("lesson-a", 0, text);
    const id1 = createAudioIdentity("lesson-a", 1, text);

    const a = pipelineCacheKey(text, "default", {
      lessonParagraph: true,
      audioIdentity: id0,
    });
    const b = pipelineCacheKey(text, "default", {
      lessonParagraph: true,
      audioIdentity: id1,
    });
    expect(a).not.toBe(b);
  });

  it("learning-backed strategy picks static_first when static dominates", () => {
    const text = "short";
    const key = pipelineCacheKey(text, "default");
    for (let i = 0; i < 6; i++) {
      recordLayerOutcome(key, "static", true, 180);
    }
    const strategy = resolvePipelineStrategy(text, basePolicy(), key);
    expect(strategy).toBe("static_first");
  });

  it("markLayerFailed skips layer temporarily", () => {
    const key = pipelineCacheKey("fail test", "default");
    markLayerFailed("static", key);
    expect(isLayerRecentlyFailed("static", key)).toBe(true);
    vi.advanceTimersByTime(11_000);
    expect(isLayerRecentlyFailed("static", key)).toBe(false);
  });

  it("resolvePipelineStrategy picks dynamic_first for long text", () => {
    const longText = "x".repeat(LONG_TEXT_THRESHOLD + 1);
    const key = pipelineCacheKey(longText, "default");
    const strategy = resolvePipelineStrategy(longText, basePolicy(), key);
    expect(strategy).toBe("dynamic_first");
  });

  it("runStagedPregenRace returns static when it resolves quickly", async () => {
    const staticRun = vi.fn().mockResolvedValue({ ok: true, layer: "static" });
    const cacheRun = vi.fn().mockResolvedValue({ ok: true, layer: "cache" });

    const promise = runStagedPregenRace(staticRun, cacheRun, 1200, () => false);
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.layer).toBe("static");
    expect(cacheRun).not.toHaveBeenCalled();
  });

  it("runStagedPregenRace starts cache after staged delay", async () => {
    const staticRun = vi.fn(
      () =>
        new Promise<{ ok: true; layer: "static" }>((resolve) => {
          setTimeout(() => resolve({ ok: true, layer: "static" }), 500);
        }),
    );
    const cacheRun = vi.fn().mockResolvedValue({ ok: true, layer: "cache" });

    const promise = runStagedPregenRace(staticRun, cacheRun, 1200, () => false);
    await vi.advanceTimersByTimeAsync(140);
    expect(cacheRun).toHaveBeenCalled();
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it("createAdaptivePipelineBudget can shrink below base max", () => {
    const key = pipelineCacheKey("hello", "default");
    for (let i = 0; i < 5; i++) {
      recordLayerOutcome(key, "cache", true, 220);
    }
    const budget = createAdaptivePipelineBudget(key, "hello", basePolicy());
    expect(budget.maxMs).toBeLessThanOrEqual(MAX_PIPELINE_TIME_MS);
  });

  it("PipelineTimeBudget detects exceeded budget", () => {
    const budget = new PipelineTimeBudget(100);
    expect(budget.exceeded()).toBe(false);
    vi.advanceTimersByTime(150);
    expect(budget.exceeded()).toBe(true);
    expect(budget.elapsed()).toBeGreaterThanOrEqual(100);
  });

  it("waitUntilEndWithCap resolves when wait exceeds duration cap", async () => {
    const waitFn = vi.fn(
      () =>
        new Promise<{ ok: boolean }>((resolve) => {
          setTimeout(() => resolve({ ok: true }), 10_000);
        }),
    );

    const promise = waitUntilEndWithCap(waitFn, 2, () => false);
    await vi.advanceTimersByTimeAsync(3_500);
    const result = await promise;
    expect(result.ok).toBe(true);
  });

  it("MAX_PIPELINE_TIME_MS is 2500", () => {
    expect(MAX_PIPELINE_TIME_MS).toBe(2500);
  });
});
