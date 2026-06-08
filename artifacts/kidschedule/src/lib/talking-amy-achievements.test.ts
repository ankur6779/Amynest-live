import { beforeEach, describe, expect, it } from "vitest";
import {
  findNewlyUnlockedAchievements,
  mergeUnlockedAchievements,
} from "./talking-amy-achievements";
import { loadTalkingAmyCollection, recordTalkingAmyCollectionUse } from "./talking-amy-collection";

describe("talking-amy-achievements", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("unlocks echo explorer at 10 repeats", () => {
    const collection = loadTalkingAmyCollection(1);
    const fresh = findNewlyUnlockedAchievements(10, collection, []);
    expect(fresh.map((a) => a.id)).toContain("echo_explorer");
  });

  it("unlocks ghost hunter after 10 ghost uses", () => {
    let collection = loadTalkingAmyCollection(3);
    for (let i = 0; i < 10; i++) {
      collection = recordTalkingAmyCollectionUse(3, "ghost");
    }
    const fresh = findNewlyUnlockedAchievements(10, collection, []);
    expect(fresh.map((a) => a.id)).toContain("ghost_hunter");
  });

  it("persists unlocks per child", () => {
    const childId = 7;
    const collection = loadTalkingAmyCollection(childId);
    const first = mergeUnlockedAchievements(childId, 10, collection);
    expect(first.newlyUnlocked.length).toBeGreaterThanOrEqual(1);
    const second = mergeUnlockedAchievements(childId, 11, collection);
    expect(second.newlyUnlocked).toHaveLength(0);
  });
});
