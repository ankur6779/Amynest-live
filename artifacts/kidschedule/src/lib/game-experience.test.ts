import { describe, expect, it } from "vitest";
import {
  GAME_IDLE_HINT_MS,
  GAME_INTRO_AUTO_MS,
  getChildResultHeadline,
  getChildResultSubline,
  getCorrectEncouragement,
  getGameIntro,
  getIdleHint,
  getParentPracticeNote,
  getWrongEncouragement,
} from "./game-experience";
import { getGameLearning } from "./game-learning";
import { GAMES } from "./games";

describe("game-experience", () => {
  const game = GAMES[0];

  it("returns stable encouraging lines", () => {
    expect(getCorrectEncouragement(1)).toBeTruthy();
    expect(getWrongEncouragement(1)).toMatch(/try|going|effort|close|Almost/i);
    expect(getIdleHint(2).length).toBeGreaterThan(8);
  });

  it("builds intro copy from learning science (not entertainment blurbs alone)", () => {
    const intro = getGameIntro(game);
    const learning = getGameLearning(game);
    expect(intro.title).toBe(game.title);
    expect(intro.body).toBe(learning.childHowTo);
    expect(intro.parentWhy).toMatch(/Pattern thinking|Ages/i);
    expect(intro.cta.length).toBeGreaterThan(2);
  });

  it("celebrates effort on results without punishment", () => {
    expect(getChildResultHeadline(true, 10, 10)).toMatch(/Amazing/i);
    expect(getChildResultHeadline(false, 2, 10)).toMatch(/trying|practice|great/i);
    expect(getChildResultSubline(game)).toMatch(/Today you practised/i);
  });

  it("explains practice for parents", () => {
    const note = getParentPracticeNote(game, 8, 10);
    expect(note).toMatch(/Practised/i);
    expect(note).toMatch(/Tip:/i);
    expect(note.length).toBeGreaterThan(40);
  });

  it("keeps idle timing gentle and intro auto long (tap-to-start preferred)", () => {
    expect(GAME_IDLE_HINT_MS).toBeGreaterThanOrEqual(10_000);
    expect(GAME_INTRO_AUTO_MS).toBeGreaterThanOrEqual(15_000);
  });

  it("soft-fail copy never reveals emoji or digits as answers", async () => {
    const { getSoftFailEncouragement, getSoftFailHint } = await import("./game-experience");
    const line = getSoftFailEncouragement(1, 0);
    expect(line).toMatch(/try|again|close|effort|going|warmer/i);
    expect(line).not.toMatch(/look for|answer was|was 🚗/i);
    expect(getSoftFailHint("pattern", 2)).toMatch(/Hint:/i);
    expect(getSoftFailHint("pattern", 1)).toBeNull();
  });
});
