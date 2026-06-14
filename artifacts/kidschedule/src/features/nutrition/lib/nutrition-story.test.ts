import { describe, expect, it } from "vitest";
import {
  buildInsightCandidates,
  generateWeeklyNutritionStory,
  selectOneInsight,
} from "@/features/nutrition/lib/nutrition-story";

describe("nutrition-story", () => {
  it("generates three wins and a focus area", () => {
    const story = generateWeeklyNutritionStory({
      weeklyTrend: [
        { dateKey: "2026-06-10", score: 50, minDayMet: true, checked: 4 },
        { dateKey: "2026-06-11", score: 60, minDayMet: true, checked: 5 },
        { dateKey: "2026-06-12", score: 70, minDayMet: true, checked: 6 },
        { dateKey: "2026-06-13", score: 75, minDayMet: true, checked: 6 },
        { dateKey: "2026-06-14", score: 80, minDayMet: true, checked: 7 },
      ],
      streak: 4,
      focusNutrientId: "iron",
      checklistHits: { protein: 5, dairy: 4, greens: 3 },
      daysLogged: 5,
    });

    expect(story.wins).toHaveLength(3);
    expect(story.focusLabel).toBe("Iron");
    expect(story.wins.some((w) => w.includes("Protein"))).toBe(true);
  });

  it("selects highest-priority insight", () => {
    const candidates = buildInsightCandidates({
      weeklyTrend: [],
      streak: 5,
      focusNutrientId: "protein",
      checklistHits: { protein: 5 },
      daysLogged: 5,
      confidenceLevel: "steady",
    });
    expect(selectOneInsight(candidates)).toBe("Protein appeared consistently this week.");
  });

  it("falls back to encouraging defaults when data is sparse", () => {
    const story = generateWeeklyNutritionStory({
      weeklyTrend: [],
      streak: 0,
      focusNutrientId: "variety",
      checklistHits: {},
      daysLogged: 0,
    });
    expect(story.wins.every(Boolean)).toBe(true);
  });
});
