import { beforeEach, describe, expect, it } from "vitest";
import {
  findNewlyUnlockedAchievements,
  mergeUnlockedAchievements,
} from "./talking-amy-achievements";

describe("talking-amy-achievements", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("unlocks echo explorer at 10 repeats", () => {
    const fresh = findNewlyUnlockedAchievements(10, []);
    expect(fresh.map((a) => a.id)).toContain("echo_explorer");
  });

  it("persists unlocks per child", () => {
    const childId = 7;
    const first = mergeUnlockedAchievements(childId, 10);
    expect(first.newlyUnlocked).toHaveLength(1);
    const second = mergeUnlockedAchievements(childId, 11);
    expect(second.newlyUnlocked).toHaveLength(0);
  });
});
