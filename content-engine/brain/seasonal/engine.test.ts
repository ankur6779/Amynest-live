import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activeSeasonalEvents, listSeasonalEvents } from "./engine.js";

describe("seasonal engine", () => {
  it("lists India festivals and parenting calendar events", () => {
    const events = listSeasonalEvents("IN", 2026);
    const kinds = new Set(events.map((e) => e.kind));
    assert.ok(kinds.has("festival"));
    assert.ok(kinds.has("summer-vacation"));
    assert.ok(kinds.has("exam-season"));
    assert.ok(kinds.has("winter-holiday"));
    assert.ok(kinds.has("school-calendar"));
    assert.ok(kinds.has("national-event"));
    assert.ok(kinds.has("parenting-awareness"));
    assert.ok(events.some((e) => e.name === "Diwali"));
    assert.ok(events.some((e) => e.name === "Independence Day"));
  });

  it("detects active events overlapping a planning window", () => {
    const events = listSeasonalEvents("IN", 2026);
    const active = activeSeasonalEvents(events, "2026-07-01", "2026-07-31");
    assert.ok(active.some((e) => e.id.includes("parenting-awareness")));
  });

  it("recommends campaign series on seasonal events", () => {
    const summer = listSeasonalEvents("IN", 2026).find(
      (e) => e.kind === "summer-vacation",
    );
    assert.ok(summer);
    assert.ok(summer!.recommendedSeries.includes("Weekend Activities"));
    assert.ok(summer!.recommendedCategories.includes("Family Activities"));
  });
});
