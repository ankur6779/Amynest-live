import { describe, expect, it } from "vitest";
import { getNutritionCountryProfile } from "@workspace/nutrition-localization";
import { isSchoolAgeBand, planSchoolTiffinWeek } from "@/features/nutrition/lib/tiffin-planner";

describe("tiffin-planner", () => {
  const india = getNutritionCountryProfile("IN");
  const memory = [
    {
      dateKey: "2026-06-01",
      mealSlot: "lunch",
      mealName: "Idli with chutney",
      mealKey: "idli with chutney",
      outcome: "loved" as const,
      updatedAt: "2026-06-01T12:00:00Z",
    },
    {
      dateKey: "2026-06-02",
      mealSlot: "lunch",
      mealName: "Ragi porridge",
      mealKey: "ragi porridge",
      outcome: "skipped" as const,
      updatedAt: "2026-06-02T12:00:00Z",
    },
    {
      dateKey: "2026-06-03",
      mealSlot: "lunch",
      mealName: "Ragi porridge",
      mealKey: "ragi porridge",
      outcome: "skipped" as const,
      updatedAt: "2026-06-03T12:00:00Z",
    },
  ];

  it("returns 5 school days", () => {
    const days = planSchoolTiffinWeek({
      ageGroupId: "school_6_10",
      foodStyle: "south_indian",
      weekLunches: ["Idli with chutney", "Lemon rice", "Curd rice"],
      countryProfile: india,
      memoryEntries: memory,
    });
    expect(days).toHaveLength(5);
    expect(days.map((d) => d.dayLabel)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
  });

  it("avoids repetition within the week", () => {
    const days = planSchoolTiffinWeek({
      ageGroupId: "preschool_3_6",
      foodStyle: "indian",
      weekLunches: ["Dal rice", "Vegetable khichdi", "Roti sabzi", "Poha", "Upma"],
      countryProfile: india,
    });
    const keys = days.map((d) => d.suggestion.toLowerCase());
    expect(new Set(keys).size).toBe(5);
  });

  it("prefers loved meals from memory", () => {
    const days = planSchoolTiffinWeek({
      ageGroupId: "school_6_10",
      foodStyle: "south_indian",
      weekLunches: ["Idli with chutney", "Lemon rice"],
      countryProfile: india,
      memoryEntries: memory,
    });
    expect(days.some((d) => d.suggestion.toLowerCase().includes("idli"))).toBe(true);
  });

  it("isSchoolAgeBand identifies school bands", () => {
    expect(isSchoolAgeBand("school_6_10")).toBe(true);
    expect(isSchoolAgeBand("infant_0_6m")).toBe(false);
  });
});
