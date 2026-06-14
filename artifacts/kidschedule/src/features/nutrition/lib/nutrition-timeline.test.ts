import { describe, expect, it } from "vitest";
import { buildNutritionTimeline } from "@/features/nutrition/lib/nutrition-timeline";

describe("nutrition-timeline", () => {
  it("includes streak and meal milestones", () => {
    const events = buildNutritionTimeline({
      todayKey: "2026-06-14",
      streak: 5,
      confidenceLevel: "strong",
      memoryEntries: Array.from({ length: 5 }, (_, i) => ({
        dateKey: `2026-06-${String(i + 1).padStart(2, "0")}`,
        mealSlot: "dinner",
        mealName: "Dal Khichdi",
        mealKey: "dal khichdi",
        outcome: "loved" as const,
        updatedAt: `2026-06-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
      })),
      ref: new Date("2026-06-14"),
    });

    expect(events.some((e) => e.kind === "streak")).toBe(true);
    expect(events.some((e) => e.kind === "meal")).toBe(true);
  });
});
