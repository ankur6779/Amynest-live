import { describe, expect, it } from "vitest";
import {
  lerpPresetToward,
  motionPresetForState,
} from "./amy-character-presets";

describe("amy-character-presets", () => {
  it("keeps motion amplitudes below 2%", () => {
    const idle = motionPresetForState("idle");
    expect(idle.breathAmp).toBeLessThanOrEqual(0.02);
    expect(idle.floatAmp).toBeLessThanOrEqual(0.02);
    expect(idle.swayAmp).toBeLessThanOrEqual(2);
  });

  it("lerps toward listening preset smoothly", () => {
    const from = motionPresetForState("idle");
    const to = motionPresetForState("listening");
    const mid = lerpPresetToward(from, to, 0.11, 220);
    expect(mid.rotateY).toBeGreaterThan(from.rotateY);
    expect(mid.rotateY).toBeLessThan(to.rotateY);
  });
});
