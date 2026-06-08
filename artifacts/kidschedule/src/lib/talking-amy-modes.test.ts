import { describe, expect, it } from "vitest";
import {
  TALKING_AMY_DEFAULT_MODE,
  TALKING_AMY_MODES,
  getChipmunkPlaybackRate,
  getTalkingAmyMode,
  pickTalkingAmyReaction,
} from "./talking-amy-modes";
import { pickSurpriseTalkingAmyMode, randomCelebrateDurationMs } from "./talking-amy-session";

describe("talking-amy-modes", () => {
  it("defines nine regular modes with chipmunk default", () => {
    expect(TALKING_AMY_MODES).toHaveLength(9);
    expect(TALKING_AMY_MODES[0]?.id).toBe("chipmunk");
    expect(TALKING_AMY_DEFAULT_MODE).toBe("chipmunk");
    expect(TALKING_AMY_MODES.map((m) => m.id)).toEqual([
      "chipmunk",
      "baby",
      "robot",
      "alien",
      "monster",
      "ghost",
      "space",
      "magic",
      "frog",
    ]);
  });

  it("applies baby pitch and soft low-pass", () => {
    const baby = getTalkingAmyMode("baby");
    expect(baby.voice.detuneCents).toBe(500);
    expect(baby.voice.playbackRate).toBe(1.1);
    expect(baby.voice.lowPassHz).toBeGreaterThan(0);
  });

  it("applies chipmunk clarity-first preset", () => {
    const chip = getTalkingAmyMode("chipmunk");
    expect(chip.voice.detuneCents).toBe(600);
    expect(chip.voice.playbackRate).toBe(1.35);
    expect(chip.voice.lowPassHz).toBeGreaterThan(0);
    expect(chip.theme.brightPurplePulse).toBe(true);
  });

  it("adapts chipmunk playback rate by recording length", () => {
    expect(getChipmunkPlaybackRate(1.5)).toBe(1.45);
    expect(getChipmunkPlaybackRate(2)).toBe(1.35);
    expect(getChipmunkPlaybackRate(4)).toBe(1.35);
    expect(getChipmunkPlaybackRate(5)).toBe(1.35);
    expect(getChipmunkPlaybackRate(6)).toBe(1.2);
    expect(getChipmunkPlaybackRate(10)).toBe(1.2);
  });

  it("applies monster deep voice preset", () => {
    const monster = getTalkingAmyMode("monster");
    expect(monster.voice.detuneCents).toBe(-600);
    expect(monster.voice.playbackRate).toBe(0.8);
    expect(monster.theme.giantBounce).toBe(true);
  });

  it("picks weighted mode-specific reactions", () => {
    const ghost = getTalkingAmyMode("ghost");
    const reaction = pickTalkingAmyReaction(ghost);
    expect(typeof reaction).toBe("string");
    expect(reaction.length).toBeGreaterThan(0);
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
