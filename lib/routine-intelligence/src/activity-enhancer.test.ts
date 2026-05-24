import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enhanceActivities, safeEnhanceActivities } from "./activity-enhancer.js";

const baseItem = {
  time: "16:00",
  activity: "STEM activity",
  duration: 40,
  category: "study",
  notes: "Keep it fun",
};

describe("enhanceActivities", () => {
  it("localizes study titles for India", () => {
    const [out] = enhanceActivities([baseItem], {
      age: 8,
      country: "IN",
      interests: [],
      goals: [],
    });
    assert.equal(out!.activity, "EVS concept revision");
    assert.match(out!.description ?? "", /school-aligned/);
    assert.ok(out!.linkedModules?.includes("parent_focus_guide"));
    assert.equal(out!.duration, 40);
    assert.equal(out!.time, "16:00");
    assert.equal(out!.notes, "Keep it fun");
  });

  it("keeps pinned meal blocks unchanged", () => {
    const meal = {
      time: "08:00",
      activity: "Breakfast",
      duration: 25,
      category: "meal",
    };
    const [out] = enhanceActivities([meal], { age: 7, country: "IN" });
    assert.deepEqual(out, meal);
  });

  it("is deterministic for the same item", () => {
    const ctx = { age: 9, country: "US", interests: [], goals: [] };
    const a = enhanceActivities([{ ...baseItem, category: "play" }], ctx)[0]!.activity;
    const b = enhanceActivities([{ ...baseItem, category: "play" }], ctx)[0]!.activity;
    assert.equal(a, b);
  });

  it("returns originals when enhancer throws", () => {
    const items = [{ ...baseItem }];
    const out = safeEnhanceActivities(items, {
      age: 8,
      country: "IN",
      get interests() {
        throw new Error("boom");
      },
    } as never);
    assert.deepEqual(out, items);
  });
});
