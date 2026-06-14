import { describe, expect, it } from "vitest";
import { getMondayBasedDayIndex, monthsToAgeGroupId } from "@/features/nutrition/lib/age-band-map";

describe("monthsToAgeGroupId", () => {
  it("maps infant ages", () => {
    expect(monthsToAgeGroupId(3)).toBe("infant_0_6");
    expect(monthsToAgeGroupId(8)).toBe("infant_6_12");
  });

  it("maps toddler and school ages", () => {
    expect(monthsToAgeGroupId(18)).toBe("toddler_1_3");
    expect(monthsToAgeGroupId(48)).toBe("preschool_3_6");
    expect(monthsToAgeGroupId(84)).toBe("school_6_10");
  });

  it("defaults when unknown", () => {
    expect(monthsToAgeGroupId(null)).toBe("toddler_1_3");
  });
});

describe("getMondayBasedDayIndex", () => {
  it("returns 0 for Monday", () => {
    expect(getMondayBasedDayIndex(new Date("2026-06-15"))).toBe(0);
  });

  it("returns 6 for Sunday", () => {
    expect(getMondayBasedDayIndex(new Date("2026-06-14"))).toBe(6);
  });
});
