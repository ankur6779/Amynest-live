import { describe, expect, it } from "vitest";
import {
  computeFluencyScore,
  defaultFluencyState,
  fluencyTrend,
  recordStoryComplete,
  recordWordAttempt,
} from "./fluency-tracker";

describe("fluency-tracker", () => {
  it("computes fluency from completion ratio", () => {
    expect(computeFluencyScore(10, 8, 1)).toBeGreaterThan(60);
  });

  it("tracks words and stories", () => {
    let state = defaultFluencyState();
    state = recordWordAttempt(state, true);
    state = recordStoryComplete(state);
    expect(state.wordsAttemptedTotal).toBe(1);
    expect(state.storiesCompletedTotal).toBe(1);
  });

  it("returns trend windows", () => {
    const state = recordWordAttempt(defaultFluencyState(), true);
    const t = fluencyTrend(state, 7);
    expect(t.avgScore).toBeGreaterThanOrEqual(0);
  });
});
