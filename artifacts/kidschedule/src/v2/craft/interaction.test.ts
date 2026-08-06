import { describe, expect, it } from "vitest";
import {
  V2_DURATION,
  V2_MOTION_MS,
  V2_PRESS_CARD,
  V2_PRESS_GHOST,
  V2_PRESS_PRIMARY,
  V2_PRESS_SECONDARY,
  V2_PRESS_TAB,
  V2_TRANSITION,
} from "./interaction";
import { V2_DURATION_MS, V2_PRESS_SCALE } from "./constitution";

describe("Wave B interaction craft (Constitution P0.1)", () => {
  it("motion hierarchy matches Constitution micro · ui · page · ritual", () => {
    expect(V2_MOTION_MS.tap).toBe(V2_DURATION_MS.micro);
    expect(V2_MOTION_MS.card).toBe(V2_DURATION_MS.ui);
    expect(V2_MOTION_MS.sheet).toBe(V2_DURATION_MS.page);
    expect(V2_MOTION_MS.page).toBe(V2_DURATION_MS.page);
    expect(V2_MOTION_MS.ritual).toBe(V2_DURATION_MS.ritual);

    expect(V2_DURATION.tap).toBe(V2_MOTION_MS.tap / 1000);
    expect(V2_TRANSITION.tap.duration).toBe(V2_DURATION.tap);
    expect(V2_TRANSITION.card.duration).toBe(V2_DURATION.card);
    expect(V2_TRANSITION.sheet.duration).toBe(V2_DURATION.sheet);
    expect(V2_TRANSITION.page.duration).toBe(V2_DURATION.page);
  });

  it("press tokens use Constitution scale · no bounce", () => {
    for (const token of [
      V2_PRESS_PRIMARY,
      V2_PRESS_SECONDARY,
      V2_PRESS_GHOST,
      V2_PRESS_CARD,
      V2_PRESS_TAB,
    ]) {
      expect(token).toMatch(/touch-manipulation/);
      expect(token.toLowerCase()).not.toMatch(/bounce|animate-bounce|spring/);
      expect(token).not.toMatch(/hover:scale-\[1\./);
      expect(token).toMatch(/v2-focus-light/);
    }
    expect(V2_PRESS_PRIMARY).toContain(`active:scale-[${V2_PRESS_SCALE}]`);
    expect(V2_PRESS_PRIMARY).toMatch(/disabled:opacity-40/);
    expect(V2_PRESS_PRIMARY).toMatch(/v2-bloom-light/);
  });

  it("duration classes use Constitution family", () => {
    expect(V2_PRESS_PRIMARY).toMatch(/--v2-duration-micro/);
    expect(V2_PRESS_CARD).toMatch(/--v2-duration-ui/);
  });
});
