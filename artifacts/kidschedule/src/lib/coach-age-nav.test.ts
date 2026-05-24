import { describe, expect, it } from "vitest";
import {
  childToCoachAgeBand,
  coachBandToAgeAnswer,
  coachAgeAnswerToApi,
  groupCategoriesForBand,
  isCategoryVisibleForBand,
  getCategoryHint,
} from "./coach-age-nav";

describe("childToCoachAgeBand", () => {
  it("maps months and years to coach bands", () => {
    expect(childToCoachAgeBand(0, 6)).toBe("0-2");
    expect(childToCoachAgeBand(1, 6)).toBe("0-2");
    expect(childToCoachAgeBand(2, 0)).toBe("2-4");
    expect(childToCoachAgeBand(4, 11)).toBe("2-4");
    expect(childToCoachAgeBand(5, 0)).toBe("5-7");
    expect(childToCoachAgeBand(9, 0)).toBe("8-10");
    expect(childToCoachAgeBand(12, 0)).toBe("10+");
  });
});

describe("isCategoryVisibleForBand", () => {
  it("shows infant category only for 0-2", () => {
    expect(isCategoryVisibleForBand("infant-problems", "0-2")).toBe(true);
    expect(isCategoryVisibleForBand("infant-problems", "5-7")).toBe(false);
  });

  it("shows toddler behavior for 2-4", () => {
    expect(isCategoryVisibleForBand("toddler-behavior", "2-4")).toBe(true);
    expect(isCategoryVisibleForBand("toddler-behavior", "8-10")).toBe(false);
  });

  it("excludes for-you from age-band child topics", () => {
    for (const band of ["0-2", "2-4", "5-7", "8-10", "10+"] as const) {
      expect(isCategoryVisibleForBand("for-you", band)).toBe(false);
    }
  });
});

describe("groupCategoriesForBand", () => {
  const categories = [
    { id: "infant-problems" },
    { id: "behavior" },
    { id: "for-you" },
    { id: "family-dynamics" },
  ];

  it("groups visible categories for 0-2 without for-you", () => {
    const groups = groupCategoriesForBand(categories, "0-2");
    const ids = groups.flatMap((g) => g.categories.map((c) => c.id));
    expect(ids).toContain("infant-problems");
    expect(ids).not.toContain("for-you");
    expect(ids).not.toContain("behavior");
  });
});

describe("coach age answer mapping", () => {
  it("round-trips UI labels to API values", () => {
    expect(coachBandToAgeAnswer("0-2")).toBe("0–2 years");
    expect(coachAgeAnswerToApi("0–2 years")).toBe("0-2");
    expect(coachAgeAnswerToApi("10+ years (tween/teen)")).toBe("10+");
  });
});

describe("getCategoryHint", () => {
  it("suggests toddler behavior for 2-4 on behavior category", () => {
    expect(getCategoryHint("behavior", "2-4")?.targetCategoryId).toBe("toddler-behavior");
  });

  it("suggests infant problems for 0-2 on sleep", () => {
    expect(getCategoryHint("sleep", "0-2")?.targetCategoryId).toBe("infant-problems");
  });
});
