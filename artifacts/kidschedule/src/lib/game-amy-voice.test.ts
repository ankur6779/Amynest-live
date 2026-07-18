import { describe, expect, it } from "vitest";
import {
  getAmyCelebrationLine,
  getAmyContinueEmpty,
  getAmyGreeting,
  getAmyHeroTip,
  getAmyLimitMessage,
  getAmyLoadingLine,
} from "./game-amy-voice";
import { GAMES } from "./games";

describe("game-amy-voice", () => {
  it("rotates greetings by time of day", () => {
    const morning = getAmyGreeting(new Date("2026-07-18T08:00:00"));
    const evening = getAmyGreeting(new Date("2026-07-18T20:00:00"));
    expect(morning.length).toBeGreaterThan(10);
    expect(evening.length).toBeGreaterThan(10);
    expect(morning).not.toBe(evening);
  });

  it("keeps tips warm and non-punitive", () => {
    expect(getAmyLimitMessage()).toMatch(/tomorrow|proud|rest|complete/i);
    expect(getAmyContinueEmpty()).toMatch(/Play|adventure/i);
    expect(getAmyLoadingLine(1)).toMatch(/ready|stage|sparkles/i);
    expect(getAmyCelebrationLine(true, 1)).toMatch(/Amy/i);
    expect(getAmyHeroTip(GAMES[0])).toBeTruthy();
  });
});
