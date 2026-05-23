import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  _resetServerSyncForTests,
  _setServerStrategyForTests,
  hashCacheKeySync,
  mergeHybridScore,
  getServerLayerScore,
} from "@/lib/amy-voice-pipeline-server-sync";
import {
  _resetPipelineLearningForTests,
  getRankedLearnableLayers,
  type LayerScoringContext,
} from "@/lib/amy-voice-pipeline-learning";

function baseContext(overrides: Partial<LayerScoringContext> = {}): LayerScoringContext {
  return {
    textLength: 30,
    shortText: true,
    lessonMode: false,
    phonics: false,
    catalogPlayback: false,
    deviceClass: "mid",
    networkProfile: "fast",
    module: "default",
    ...overrides,
  };
}

describe("amy-voice-pipeline-server-sync", () => {
  beforeEach(() => {
    _resetServerSyncForTests();
    _resetPipelineLearningForTests();
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("hashCacheKeySync is stable and non-reversible", () => {
    const a = hashCacheKeySync("lesson:default:hello world");
    const b = hashCacheKeySync("lesson:default:hello world");
    expect(a).toBe(b);
    expect(a).not.toContain("hello");
  });

  it("mergeHybridScore favors server when no client data", () => {
    _setServerStrategyForTests({
      preferredLayers: ["static", "cache", "api", "elevenlabs"],
      penalties: {},
      boosts: {},
      apiDegraded: false,
      popularCacheKeys: [],
      transitions: {},
    });
    expect(mergeHybridScore(0.4, 0.9, false)).toBe(0.9);
  });

  it("mergeHybridScore blends client and server when client has data", () => {
    _setServerStrategyForTests({
      preferredLayers: ["cache", "static", "api", "elevenlabs"],
      penalties: {},
      boosts: {},
      apiDegraded: false,
      popularCacheKeys: [],
      transitions: {},
    });
    expect(mergeHybridScore(0.8, 0.5, true)).toBeCloseTo(0.68, 2);
  });

  it("getServerLayerScore applies penalties and boosts", () => {
    _setServerStrategyForTests({
      preferredLayers: ["static", "cache", "api", "elevenlabs"],
      penalties: { api: 0.3 },
      boosts: { static: 0.15 },
      apiDegraded: false,
      popularCacheKeys: [],
      transitions: {},
    });
    const ctx = baseContext();
    expect(getServerLayerScore("static", ctx)).toBeGreaterThan(getServerLayerScore("api", ctx));
  });

  it("getRankedLearnableLayers uses server preference without client history", () => {
    _setServerStrategyForTests({
      preferredLayers: ["cache", "static", "api", "elevenlabs"],
      penalties: { api: 0.2 },
      boosts: { cache: 0.1 },
      apiDegraded: false,
      popularCacheKeys: [],
      transitions: {},
    });

    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const ranked = getRankedLearnableLayers("default:default:hello", baseContext());
    expect(ranked[0]).toBe("cache");
    vi.mocked(Math.random).mockRestore();
  });
});
