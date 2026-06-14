import { describe, expect, it } from "vitest";
import {
  aggregateChecklistHits,
  inferChecklistHitsFromCount,
  nutrientDisplayName,
  selectFocusNutrient,
} from "@/features/nutrition/lib/focus-nutrient-engine";

describe("focus-nutrient-engine", () => {
  it("prioritizes age-relevant nutrient when no history", () => {
    const focus = selectFocusNutrient({
      ageGroupId: "toddler_1_3",
      weeklyTrend: [],
      checklistHits: {},
      daysLogged: 0,
    });
    expect(focus.nutrientId).toBe("iron");
    expect(focus.rationale).toBeTruthy();
  });

  it("selects nutrient with largest historical gap", () => {
    const focus = selectFocusNutrient({
      ageGroupId: "school_6_10",
      weeklyTrend: [
        { dateKey: "2026-06-12", score: 50, minDayMet: true, checked: 4 },
        { dateKey: "2026-06-13", score: 50, minDayMet: true, checked: 4 },
      ],
      checklistHits: { protein: 2, dairy: 0, greens: 0 },
      daysLogged: 2,
    });
    expect(["calcium", "iron", "vitamin_a", "vitamin_c"]).toContain(focus.nutrientId);
  });

  it("infers checklist hits from checked count", () => {
    const hits = inferChecklistHitsFromCount(5);
    expect(hits.protein).toBe(true);
    expect(hits.greens).toBe(true);
    expect(hits.noJunk).toBeUndefined();
  });

  it("uses canonical dayChecklists when available", () => {
    const { checklistHits, daysLogged } = aggregateChecklistHits(
      [
        { dateKey: "2026-06-13", score: 50, minDayMet: true, checked: 2 },
        { dateKey: "2026-06-14", score: 25, minDayMet: true, checked: 2 },
      ],
      { breakfast: true, fruit: true },
      "2026-06-14",
      { "2026-06-13": { protein: true, dairy: true } },
    );
    expect(daysLogged).toBe(2);
    expect(checklistHits.protein).toBe(1);
    expect(checklistHits.breakfast).toBe(1);
  });

  it("skips historical days without canonical checklist", () => {
    const { checklistHits, daysLogged } = aggregateChecklistHits(
      [
        { dateKey: "2026-06-13", score: 50, minDayMet: true, checked: 4 },
        { dateKey: "2026-06-14", score: 25, minDayMet: true, checked: 2 },
      ],
      { breakfast: true, fruit: true },
      "2026-06-14",
      {},
    );
    expect(daysLogged).toBe(1);
    expect(checklistHits.breakfast).toBe(1);
    expect(checklistHits.protein).toBeUndefined();
  });

  it("formats nutrient display names", () => {
    expect(nutrientDisplayName("vitamin_a")).toBe("Vitamin A");
  });
});
