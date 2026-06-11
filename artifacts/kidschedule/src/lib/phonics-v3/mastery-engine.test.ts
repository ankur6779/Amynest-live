import { describe, expect, it } from "vitest";
import {
  computeMasteryScore,
  isTrulyMastered,
  recordMasteryEvent,
  scoreToBand,
  defaultMasteryState,
  MASTERY_THRESHOLDS,
} from "./mastery-engine";

describe("mastery-engine", () => {
  it("requires all dimensions for true mastery", () => {
    const counts = {
      heard: MASTERY_THRESHOLDS.heard,
      blended: MASTERY_THRESHOLDS.blended,
      identified: MASTERY_THRESHOLDS.identified,
      spoken: MASTERY_THRESHOLDS.spoken,
    };
    const score = computeMasteryScore(counts);
    expect(score).toBe(100);
    expect(isTrulyMastered(counts, score)).toBe(true);
    expect(scoreToBand(score)).toBe("mastered");
  });

  it("partial progress maps to practicing band", () => {
    const counts = { heard: 2, blended: 2, identified: 1, spoken: 1 };
    const score = computeMasteryScore(counts);
    expect(score).toBeGreaterThanOrEqual(40);
    expect(score).toBeLessThan(70);
    expect(scoreToBand(score)).toBe("practicing");
  });

  it("records events per word with history", () => {
    let state = defaultMasteryState();
    for (let i = 0; i < 3; i++) {
      state = recordMasteryEvent(state, "word", "cat", "heard");
    }
    const rec = state.words.cat!;
    expect(rec.counts.heard).toBe(MASTERY_THRESHOLDS.heard);
    expect(rec.history.length).toBeGreaterThan(0);
  });
});
