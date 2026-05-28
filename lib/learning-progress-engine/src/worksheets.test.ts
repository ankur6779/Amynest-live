import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { pickDailyWorksheets } from "./worksheets.js";
import { getUnlocks, defaultSectionProgress } from "./index.js";

describe("pickDailyWorksheets", () => {
  it("returns skill-matched picks", () => {
    const unlocks = getUnlocks({
      age: 6,
      journeyDay: 5,
      masteryScore: 50,
      streakDays: 3,
      completedActivities: [],
      sectionProgress: defaultSectionProgress(),
      isPremium: true,
      childId: 1,
      dateIso: "2026-05-28",
    });
    const catalog = [
      { id: "a", name: "Count 1-10", category: "numbers" },
      { id: "b", name: "Add sums", category: "math" },
      { id: "c", name: "Trace A", category: "tracing" },
    ];
    const picks = pickDailyWorksheets(catalog, unlocks, {
      childId: 1,
      dateIso: "2026-05-28",
      count: 2,
    });
    assert.ok(picks.length >= 1);
    assert.ok(picks.every((p) => p.difficulty === unlocks.worksheetDifficulty));
  });
});
