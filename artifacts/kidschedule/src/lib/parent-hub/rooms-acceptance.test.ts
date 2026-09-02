import { describe, expect, it } from "vitest";
import { monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";
import {
  growPathsForAge,
  isGrowRecommendEnabled,
  recommendGrowAction,
} from "@/lib/grow/living-room";
import {
  isHealthModuleEligible,
  isInfantCareAge,
  isNutritionModuleEligible,
  resolveQuietPathsForRoom,
  visibleHelpTileIdsForAge,
} from "@/lib/parent-hub/eligibility";
import { recommendPathForRoom } from "@/lib/parent-hub/room-living";

const AGE_BOUNDARIES = [11, 12, 23, 24, 35, 36, 47, 48, 59, 60, 71, 72] as const;

function profileOf(months: number): "infant" | "toddler_preschool" | "school" {
  if (months < 24) return "infant";
  if (months < 60) return "toddler_preschool";
  return "school";
}

describe("Rooms acceptance matrix", () => {
  it("keeps Nutrition + Health visible and Infant Care exclusive below 24m", () => {
    for (const months of AGE_BOUNDARIES) {
      const isInfant = isInfantCareAge(months);
      expect(isNutritionModuleEligible(months), `${months}m nutrition`).toBe(true);
      expect(isHealthModuleEligible(months), `${months}m health`).toBe(true);
      expect(isInfant, `${months}m infant`).toBe(months < 24);

      const quiet = resolveQuietPathsForRoom("care", { isInfant });
      expect(quiet.map((p) => p.title)).toContain("Nutrition");
      expect(quiet.map((p) => p.id)).toEqual(["nutrition", "health-lab"]);

      const recommend = recommendPathForRoom("care", {
        isInfant,
        childName: "Aria",
      });
      if (isInfant) {
        expect(recommend.tileId).toBe("infant-hub");
        expect(recommend.title).toMatch(/care/i);
      } else {
        expect(recommend.tileId).toBe("nutrition");
        expect(recommend.title).toMatch(/nutrition/i);
      }

      expect(monthsToAgeGroupId(months)).toMatch(
        /infant_|toddler_|preschool_|school_|preteen_/,
      );
    }
  });

  it("hides Help PTM/life-skills until Hub visibility unlocks them", () => {
    for (const months of AGE_BOUNDARIES) {
      const visible = visibleHelpTileIdsForAge(months);
      const help = resolveQuietPathsForRoom("help", {
        isInfant: isInfantCareAge(months),
        visibleTileIds: visible,
      });
      const ids = help.map((p) => p.id);
      expect(ids).toContain("emotional");
      expect(ids).toContain("speech-coach");
      if (months < 24) {
        expect(ids, `${months}m help`).not.toContain("ptm-prep");
        expect(ids, `${months}m help`).not.toContain("life-skills");
      } else {
        expect(ids, `${months}m help`).toContain("ptm-prep");
        expect(ids, `${months}m help`).toContain("life-skills");
      }
    }
  });

  it("never opens blank Grow phonics below 12m and explains disabled paths", () => {
    for (const months of AGE_BOUNDARIES) {
      const paths = growPathsForAge(months);
      const sounds = paths.find((p) => p.id === "sounds");
      expect(sounds, `${months}m sounds listed`).toBeTruthy();
      if (months < 12) {
        expect(sounds?.enabled).toBe(false);
        expect(isGrowRecommendEnabled(months)).toBe(false);
        expect(recommendGrowAction("Aria", months).purpose).toMatch(/age 1|begins/i);
      } else {
        expect(sounds?.enabled).not.toBe(false);
        expect(isGrowRecommendEnabled(months)).toBe(true);
      }
      if (months < 72) {
        expect(paths.map((p) => p.id)).not.toContain("challenge");
      } else {
        expect(paths.find((p) => p.id === "challenge")?.enabled).not.toBe(false);
      }
    }
  });

  it("covers every supported profile class in the matrix", () => {
    expect(AGE_BOUNDARIES.map(profileOf)).toContain("infant");
    expect(AGE_BOUNDARIES.map(profileOf)).toContain("toddler_preschool");
    expect(AGE_BOUNDARIES.map(profileOf)).toContain("school");
  });
});
