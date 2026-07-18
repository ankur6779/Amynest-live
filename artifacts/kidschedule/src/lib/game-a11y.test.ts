import { describe, expect, it } from "vitest";
import {
  feedbackStateMark,
  gameTileA11yLabel,
  getInclusiveTimeScale,
  scaleDurationMs,
  scaleSeconds,
  TOUCH_COMFORT,
} from "./game-a11y";

describe("game-a11y", () => {
  it("extends timing for reduced motion without changing base rules", () => {
    expect(getInclusiveTimeScale(false)).toBe(1);
    expect(getInclusiveTimeScale(true)).toBe(1.5);
    expect(scaleDurationMs(6000, 1.5)).toBe(9000);
    expect(scaleSeconds(8, 1.5)).toBe(12);
  });

  it("builds meaningful tile labels", () => {
    const label = gameTileA11yLabel({
      title: "Pattern Match",
      skillLine: "Thinking · ~2 min",
      blurb: "Find what comes next",
      playable: true,
      locked: false,
      premiumOnly: false,
      limitHit: false,
      soon: false,
      ageHint: "Ages 4–7",
    });
    expect(label).toMatch(/Pattern Match/);
    expect(label).toMatch(/Play/);
    expect(label).toMatch(/Ages 4–7/);
  });

  it("never relies on color alone for feedback marks", () => {
    expect(feedbackStateMark("correct").symbol).toBe("✓");
    expect(feedbackStateMark("wrong").sr).toMatch(/try again/i);
    expect(TOUCH_COMFORT).toBeGreaterThanOrEqual(44);
  });
});
