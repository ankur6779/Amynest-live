import { describe, expect, it } from "vitest";
import { roomsNutritionPreview } from "@/features/nutrition/lib/rooms-nutrition-preview";
import {
  growPathsForAge,
  isGrowRecommendEnabled,
} from "@/lib/grow/living-room";
import {
  isInfantCareAge,
  visibleHelpTileIdsForAge,
} from "@/lib/parent-hub/eligibility";

describe("Rooms destination acceptance", () => {
  it("Nutrition never returns an empty preview for supported Rooms ages", () => {
    for (const months of [8, 36, 72]) {
      const preview = roomsNutritionPreview(months);
      expect(preview.description.length, `${months}m description`).toBeGreaterThan(0);
      if (months >= 6) expect(preview.hasMeal, `${months}m meal`).toBe(true);
    }
  });

  it("Speech preview vs full flips at 24 months", () => {
    expect(isInfantCareAge(23)).toBe(true);
    expect(isInfantCareAge(24)).toBe(false);
    expect(visibleHelpTileIdsForAge(8)).toContain("speech-coach");
    expect(visibleHelpTileIdsForAge(36)).toContain("speech-coach");
    expect(visibleHelpTileIdsForAge(72)).toContain("speech-coach");
  });

  it("Grow enabled destinations have a tile to deepen", () => {
    const preschool = growPathsForAge(36).filter((p) => p.enabled !== false);
    expect(preschool.map((p) => p.tileId)).toEqual(
      expect.arrayContaining(["phonics", "smart-math-tricks", "abacus", "spelling-mastery"]),
    );
    expect(isGrowRecommendEnabled(36)).toBe(true);
    expect(isGrowRecommendEnabled(8)).toBe(false);
    expect(growPathsForAge(72).find((p) => p.id === "challenge")?.tileId).toBe(
      "olympiad",
    );
  });
});
