import { describe, expect, it } from "vitest";
import { GAME_MOTION, GAME_MOTION_STYLES, gameMotionCssVars } from "./game-motion";

describe("game-motion", () => {
  it("keeps a calm Apple-like duration scale", () => {
    expect(GAME_MOTION.pressMs).toBeLessThanOrEqual(120);
    expect(GAME_MOTION.enterMs).toBeLessThanOrEqual(320);
    expect(GAME_MOTION.celebrateMs).toBeLessThanOrEqual(400);
    expect(GAME_MOTION.easeOut).toContain("cubic-bezier");
  });

  it("exports shared CSS utilities", () => {
    const vars = gameMotionCssVars();
    expect(vars).toContain("--game-motion-enter");
    expect(GAME_MOTION_STYLES).toContain("game-motion-press");
    expect(GAME_MOTION_STYLES).toContain("prefers-reduced-motion");
  });
});
