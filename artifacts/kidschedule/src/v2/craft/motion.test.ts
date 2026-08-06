import { describe, expect, it } from "vitest";
import { V2_FADE_RISE_PX } from "./constitution";
import { fadeIn, fadeUp } from "./motion";

describe("Nest Presence motion variants", () => {
  it("fade rise stays Constitution ≤8px", () => {
    expect(V2_FADE_RISE_PX).toBe(8);
    expect(fadeUp.initial).toMatchObject({ y: 8 });
  });

  it("fadeIn is opacity-only (no invent scale)", () => {
    expect(fadeIn.initial).toEqual({ opacity: 0 });
    expect(fadeIn.animate).toEqual({ opacity: 1 });
  });
});
