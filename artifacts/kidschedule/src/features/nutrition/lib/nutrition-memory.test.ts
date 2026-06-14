import { describe, expect, it } from "vitest";
import {
  aggregateMealStats,
  buildMealMemorySummary,
  countSkippedRecently,
  mergeMealMemoryEntries,
  normalizeMealKey,
} from "@/features/nutrition/lib/nutrition-memory";

describe("nutrition-memory", () => {
  const entries = [
    {
      dateKey: "2026-06-10",
      mealSlot: "dinner",
      mealName: "Dal Khichdi",
      mealKey: "dal khichdi",
      outcome: "loved" as const,
      updatedAt: "2026-06-10T12:00:00Z",
    },
    {
      dateKey: "2026-06-12",
      mealSlot: "dinner",
      mealName: "Dal Khichdi",
      mealKey: "dal khichdi",
      outcome: "loved" as const,
      updatedAt: "2026-06-12T12:00:00Z",
    },
    {
      dateKey: "2026-06-13",
      mealSlot: "dinner",
      mealName: "Ragi porridge",
      mealKey: "ragi porridge",
      outcome: "skipped" as const,
      updatedAt: "2026-06-13T12:00:00Z",
    },
  ];

  it("normalizes meal keys", () => {
    expect(normalizeMealKey("  Dal Khichdi!!! ")).toBe("dal khichdi");
  });

  it("aggregates stats by meal", () => {
    const stats = aggregateMealStats(entries);
    const dal = stats.find((s) => s.mealKey === "dal khichdi");
    expect(dal?.loved).toBe(2);
  });

  it("builds parent-friendly summary", () => {
    const lines = buildMealMemorySummary(entries, "Aarav", new Date("2026-06-14"));
    expect(lines[0]?.text).toContain("Aarav");
    expect(lines[0]?.text.toLowerCase()).toContain("dal khichdi");
  });

  it("counts recent skips", () => {
    expect(countSkippedRecently(entries, "ragi porridge", 30, new Date("2026-06-14"))).toBe(1);
  });

  it("merges local and server entries by timestamp", () => {
    const merged = mergeMealMemoryEntries(
      entries,
      [
        {
          ...entries[0]!,
          outcome: "some",
          updatedAt: "2026-06-10T18:00:00Z",
        },
      ],
    );
    expect(merged.find((e) => e.dateKey === "2026-06-10")?.outcome).toBe("some");
  });
});
