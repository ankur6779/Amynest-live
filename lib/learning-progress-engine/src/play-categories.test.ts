import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getUnlocks, defaultSectionProgress } from "./index.js";
import { getPlayCategoriesWithProgress } from "./play-categories.js";

describe("getPlayCategoriesWithProgress", () => {
  it("premium unlocks numbers beyond the free journey day-3 cap of 20", () => {
    const unlocks = getUnlocks({
      age: 4,
      journeyDay: 1,
      masteryScore: 0,
      streakDays: 0,
      completedActivities: [],
      sectionProgress: defaultSectionProgress(),
      isPremium: true,
    });
    assert.equal(unlocks.numbersMax, 50);

    const cats = getPlayCategoriesWithProgress("US", 4, 1, unlocks, { isPremium: true });
    const numbers = cats.find((c) => c.id === "numbers");
    assert.ok(numbers);
    assert.equal(numbers!.items.length, 50);
    assert.equal(numbers!.items[49]!.id, "50");
  });

  it("free journey day 3 still caps at 20 numbers", () => {
    const unlocks = getUnlocks({
      age: 4,
      journeyDay: 3,
      masteryScore: 0,
      streakDays: 0,
      completedActivities: [],
      sectionProgress: defaultSectionProgress(),
      isPremium: false,
    });
    assert.equal(unlocks.numbersMax, 20);

    const cats = getPlayCategoriesWithProgress("US", 4, 3, unlocks, { isPremium: false });
    assert.equal(cats.find((c) => c.id === "numbers")!.items.length, 20);
  });
});
