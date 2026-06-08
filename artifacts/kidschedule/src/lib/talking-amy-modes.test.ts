import { describe, expect, it } from "vitest";
import {
  TALKING_AMY_DEFAULT_MODE,
  TALKING_AMY_MODES,
  getTalkingAmyMode,
  pickTalkingAmyReaction,
} from "./talking-amy-modes";
import { pickSurpriseTalkingAmyMode, randomCelebrateDurationMs } from "./talking-amy-session";

describe("talking-amy-modes", () => {
  it("defines five distinct kid-facing modes with chipmunk default", () => {
    expect(TALKING_AMY_MODES).toHaveLength(5);
    expect(TALKING_AMY_MODES[0]?.id).toBe("chipmunk");
    expect(TALKING_AMY_DEFAULT_MODE).toBe("chipmunk");
    expect(TALKING_AMY_MODES.map((m) => m.id)).toEqual([
      "chipmunk",
      "baby",
      "robot",
      "alien",
      "monster",
    ]);
  });

  it("applies baby pitch and soft low-pass", () => {
    const baby = getTalkingAmyMode("baby");
    expect(baby.voice.detuneCents).toBe(500);
    expect(baby.voice.playbackRate).toBe(1.1);
    expect(baby.voice.lowPassHz).toBeGreaterThan(0);
  });

  it("applies chipmunk fast-forward preset", () => {
    const chip = getTalkingAmyMode("chipmunk");
    expect(chip.voice.detuneCents).toBe(1000);
    expect(chip.voice.playbackRate).toBe(1.8);
    expect(chip.theme.brightPurplePulse).toBe(true);
  });

  it("applies monster deep voice preset", () => {
    const monster = getTalkingAmyMode("monster");
    expect(monster.voice.detuneCents).toBe(-600);
    expect(monster.voice.playbackRate).toBe(0.8);
    expect(monster.theme.giantBounce).toBe(true);
  });

  it("picks mode-specific reactions", () => {
    const robot = getTalkingAmyMode("robot");
    const reaction = pickTalkingAmyReaction(robot);
    expect(robot.reactions).toContain(reaction);
  });
});

describe("talking-amy-session helpers", () => {
  it("picks a different surprise mode when possible", () => {
    const next = pickSurpriseTalkingAmyMode("chipmunk");
    expect(next).not.toBe("chipmunk");
  });

  it("celebrate duration stays within 600-1200ms", () => {
    for (let i = 0; i < 20; i++) {
      const ms = randomCelebrateDurationMs();
      expect(ms).toBeGreaterThanOrEqual(600);
      expect(ms).toBeLessThanOrEqual(1200);
    }
  });
});
