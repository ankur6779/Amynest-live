import { describe, expect, it, beforeEach } from "vitest";
import { defaultRewardState } from "@workspace/math-playground";
import {
  loadPlaygroundState,
  savePlaygroundState,
  _readLegacyV2State,
  _readLegacyV3State,
} from "./storage";

const CHILD_ID = 42_001;

describe("math-playground storage v4", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("migrates v2 state to v4 on load", () => {
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
    expect(loaded.version).toBe(4);
    expect(loaded.rewards.stars).toBe(7);
    expect(loaded.engagement).toBeDefined();
    expect(loaded.intelligence).toBeDefined();

    const v4Raw = localStorage.getItem(`amynest_math_playground_v4_${CHILD_ID}`);
    expect(v4Raw).toBeTruthy();
  });

  it("migrates v3 state to v4 on load", () => {
    localStorage.setItem(
      `amynest_math_playground_v3_${CHILD_ID}`,
      JSON.stringify({
        version: 3,
        childId: CHILD_ID,
        rewards: defaultRewardState(),
        learning: { sessionHistory: [], activityStats: {} },
        lastParentSnapshot: undefined,
      }),
    );

    const loaded = loadPlaygroundState(CHILD_ID);
    expect(loaded.version).toBe(4);
    expect(localStorage.getItem(`amynest_math_playground_v4_${CHILD_ID}`)).toBeTruthy();
    expect(_readLegacyV3State(CHILD_ID)).toBeTruthy();
  });

  it("writes v4 key on save", () => {
    savePlaygroundState({
      version: 4,
      childId: CHILD_ID,
      rewards: defaultRewardState(),
      learning: { sessionHistory: [], activityStats: {} },
    });

    expect(localStorage.getItem(`amynest_math_playground_v4_${CHILD_ID}`)).toBeTruthy();
    expect(_readLegacyV2State(CHILD_ID)).toBeNull();
  });

  it("defaults fresh child to v4 with intelligence slice", () => {
    const loaded = loadPlaygroundState(CHILD_ID);
    expect(loaded.version).toBe(4);
    expect(loaded.intelligence?.generatedWorksheets).toEqual([]);
    expect(loaded.engagement?.consecutiveSuccesses).toBe(0);
  });
});
