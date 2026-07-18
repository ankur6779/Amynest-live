import { describe, expect, it } from "vitest";
import {
  formatSkillTimeLine,
  getEstimatedPlayMinutes,
  skillLevelFromPercent,
  skillStarsFromPercent,
} from "./game-hub-meta";
import { GAMES } from "./games";

describe("game-hub-meta", () => {
  it("estimates short sessions for parents", () => {
    const math = GAMES.find((g) => g.id === "number-match")!;
    const behavior = GAMES.find((g) => g.id === "what-should-you-do")!;
    expect(getEstimatedPlayMinutes(math)).toBe(2);
    expect(getEstimatedPlayMinutes(behavior)).toBe(4);
    expect(formatSkillTimeLine(math)).toMatch(/Counting sense · .+ · ~2 min/);
  });

  it("maps accuracy to stars without inventing XP", () => {
    expect(skillStarsFromPercent(0, false)).toBe(0);
    expect(skillStarsFromPercent(20, true)).toBe(1);
    expect(skillStarsFromPercent(50, true)).toBe(2);
    expect(skillStarsFromPercent(90, true)).toBe(3);
  });

  it("maps accuracy to soft levels 0–5", () => {
    expect(skillLevelFromPercent(0, false)).toBe(0);
    expect(skillLevelFromPercent(10, true)).toBe(1);
    expect(skillLevelFromPercent(100, true)).toBe(5);
  });
});
