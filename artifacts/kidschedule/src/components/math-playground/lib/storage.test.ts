import { describe, expect, it, beforeEach } from "vitest";
import { defaultRewardState } from "@workspace/math-playground";
import { loadPlaygroundState, savePlaygroundState, _readLegacyV2State } from "./storage";

const CHILD_ID = 42_001;

describe("math-playground storage v3", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates v2 state to v3 on load", () => {
    localStorage.setItem(
      `amynest_math_playground_v2_${CHILD_ID}`,
      JSON.stringify({
        version: 2,
        childId: CHILD_ID,
        rewards: { ...defaultRewardState(), stars: 7 },
        learning: { sessionHistory: [], activityStats: {} },
      }),
    );

    const loaded = loadPlaygroundState(CHILD_ID);
    expect(loaded.version).toBe(3);
    expect(loaded.rewards.stars).toBe(7);
    expect(loaded.engagement).toBeDefined();

    const v3Raw = localStorage.getItem(`amynest_math_playground_v3_${CHILD_ID}`);
    expect(v3Raw).toBeTruthy();
  });

  it("writes v3 key on save", () => {
    savePlaygroundState({
      version: 3,
      childId: CHILD_ID,
      rewards: defaultRewardState(),
      learning: { sessionHistory: [], activityStats: {} },
    });

    expect(localStorage.getItem(`amynest_math_playground_v3_${CHILD_ID}`)).toBeTruthy();
    expect(_readLegacyV2State(CHILD_ID)).toBeNull();
  });

  it("defaults fresh child to v3 with engagement", () => {
    const loaded = loadPlaygroundState(CHILD_ID);
    expect(loaded.version).toBe(3);
    expect(loaded.engagement?.consecutiveSuccesses).toBe(0);
  });
});
