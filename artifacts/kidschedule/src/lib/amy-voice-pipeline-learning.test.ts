import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  _resetPipelineLearningForTests,
  computeLayerScore,
  emptyLayerStatsMap,
  getDeviceClass,
  getNetworkProfile,
  getPredictedNextKey,
  getRankedLearnableLayers,
  recordLayerOutcome,
  recordPhraseTransition,
  resolveAdaptivePipelineBudget,
  resolveStrategyFromLayers,
  type LayerScoringContext,
} from "@/lib/amy-voice-pipeline-learning";
import { _resetRlForTests } from "@/lib/amy-voice-rl-learning";

function baseContext(overrides: Partial<LayerScoringContext> = {}): LayerScoringContext {
  return {
    textLength: 20,
    shortText: true,
    lessonMode: false,
    phonics: false,
    catalogPlayback: false,
    deviceClass: getDeviceClass(),
    networkProfile: getNetworkProfile(),
    module: "default",
    ...overrides,
  };
}

describe("amy-voice-pipeline-learning", () => {
  beforeEach(() => {
    _resetPipelineLearningForTests();
    _resetRlForTests();
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("ranks static above api when static has better success history", () => {
    const cacheKey = "default:default:hello";
    const context = baseContext();

    for (let i = 0; i < 5; i++) {
      recordLayerOutcome(cacheKey, "static", true, 200);
    }
    for (let i = 0; i < 3; i++) {
      recordLayerOutcome(cacheKey, "api", false, 1800);
    }

    const ranked = getRankedLearnableLayers(cacheKey, context);
    expect(ranked[0]).toBe("static");
  });

  it("uses global stats when phrase has no local history", () => {
    const cacheKey = "default:default:new phrase";
    recordLayerOutcome("other:key", "cache", true, 150);

    const ranked = getRankedLearnableLayers(cacheKey, baseContext());
    expect(ranked).toContain("cache");
  });

  it("computeLayerScore boosts static for short phonics text", () => {
    const stats = emptyLayerStatsMap();
    const neutral = computeLayerScore(stats.static, "static", baseContext());
    const phonics = computeLayerScore(stats.static, "static", baseContext({ phonics: true, shortText: true }));
    expect(phonics).toBeGreaterThan(neutral);
  });

  it("resolveStrategyFromLayers always prefers static_first", () => {
    const strategy = resolveStrategyFromLayers(["api", "static", "cache", "elevenlabs"], baseContext());
    expect(strategy).toBe("static_first");
  });

  it("resolveStrategyFromLayers uses static_first for long lesson paragraphs", () => {
    const longLesson = baseContext({
      lessonMode: true,
      textLength: 240,
      module: "lesson",
    });
    const strategy = resolveStrategyFromLayers(["api", "static", "cache", "elevenlabs"], longLesson);
    expect(strategy).toBe("static_first");
  });

  it("resolveAdaptivePipelineBudget shrinks when history is fast", () => {
    const cacheKey = "default:default:fast";
    for (let i = 0; i < 4; i++) {
      recordLayerOutcome(cacheKey, "static", true, 250);
    }
    const budget = resolveAdaptivePipelineBudget(cacheKey, baseContext(), 2500);
    expect(budget).toBeLessThan(2500);
    expect(budget).toBeGreaterThanOrEqual(1800);
  });

  it("recordPhraseTransition enables predictive next key", () => {
    recordPhraseTransition("lesson:a", "lesson:b");
    recordPhraseTransition("lesson:a", "lesson:b");
    recordPhraseTransition("lesson:a", "lesson:c");

    expect(getPredictedNextKey("lesson:a")).toBe("lesson:b");
  });

  it("EMA latency updates on success", () => {
    const cacheKey = "default:default:latency";
    recordLayerOutcome(cacheKey, "static", true, 1000);
    recordLayerOutcome(cacheKey, "static", true, 200);

    const ranked = getRankedLearnableLayers(cacheKey, baseContext());
    expect(ranked[0]).toBe("static");
  });
});
