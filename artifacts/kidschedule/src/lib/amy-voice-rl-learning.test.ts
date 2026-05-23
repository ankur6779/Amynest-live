import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  _resetRlForTests,
  buildRlContextKey,
  computeRlReward,
  getClientQ,
  selectLayersWithRl,
  setServerRlQ,
  updateClientQ,
} from "@/lib/amy-voice-rl-learning";
import type { LayerScoringContext } from "@/lib/amy-voice-pipeline-learning";

function ctx(overrides: Partial<LayerScoringContext> = {}): LayerScoringContext {
  return {
    textLength: 40,
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

describe("amy-voice-rl-learning", () => {
  beforeEach(() => {
    _resetRlForTests();
    vi.spyOn(Math, "random").mockReturnValue(0.99);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("computeRlReward penalizes high TTFA", () => {
    const good = computeRlReward(true, 400, 200, 0);
    const slow = computeRlReward(true, 400, 900, 0);
    expect(good).toBeGreaterThan(slow);
  });

  it("updates Q with learning rule", () => {
    const c = ctx();
    const key = buildRlContextKey(c);
    updateClientQ(c, "static", 0.8);
    expect(getClientQ(c, "static")).toBeCloseTo(0.12, 1);
    updateClientQ(c, "static", 0.8);
    expect(getClientQ(c, "static")).toBeGreaterThan(0.12);
    expect(key.length).toBeGreaterThan(4);
  });

  it("selectLayersWithRl prefers higher Q layer", () => {
    const c = ctx();
    updateClientQ(c, "cache", 0.9);
    updateClientQ(c, "api", -0.2);
    setServerRlQ({ cache: 0.5, api: 0.1, static: 0.3, elevenlabs: 0.2 });
    const { layers } = selectLayersWithRl(c, new Set(), {
      static: 0.4,
      cache: 0.4,
      api: 0.4,
      elevenlabs: 0.4,
    });
    expect(layers[0]).toBe("cache");
  });

  it("failure reward is negative", () => {
    expect(computeRlReward(false, 1000, 500, 0)).toBe(-1);
  });
});
