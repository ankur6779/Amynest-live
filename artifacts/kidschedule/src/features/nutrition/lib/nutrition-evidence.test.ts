import { describe, expect, it } from "vitest";
import { getEvidenceForNutrient, NUTRIENT_EVIDENCE } from "@/features/nutrition/lib/nutrition-evidence";

describe("nutrition-evidence", () => {
  it("provides evidence for core nutrients", () => {
    expect(NUTRIENT_EVIDENCE.iron).toBeDefined();
    expect(NUTRIENT_EVIDENCE.protein).toBeDefined();
  });

  it("returns age-aware guidance", () => {
    const ev = getEvidenceForNutrient("iron", "toddler_1_3");
    expect(ev.summary).toBeTruthy();
    expect(ev.detail).toContain("iron");
    expect(ev.source).toMatch(/WHO|ICMR/i);
  });

  it("falls back to variety evidence for unknown ids", () => {
    const ev = getEvidenceForNutrient("unknown_nutrient", "school_6_10");
    expect(ev.summary).toBeTruthy();
  });
});
