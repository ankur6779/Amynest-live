import { describe, expect, it } from "vitest";
import {
  agePartsFromTotalMonths,
  isHubInfantAgeMonths,
  monthsFromDob,
  resolveTotalAgeMonths,
  storedTotalAgeMonths,
} from "./child-age-months";

describe("child age months", () => {
  it("treats ageMonths < 12 as the remainder (table shape)", () => {
    expect(storedTotalAgeMonths({ age: 1, ageMonths: 6 })).toBe(18);
    expect(storedTotalAgeMonths({ age: 0, ageMonths: 8 })).toBe(8);
    expect(storedTotalAgeMonths({ age: 2, ageMonths: 0 })).toBe(24);
  });

  it("does not double-count AccessibleChild total months", () => {
    expect(storedTotalAgeMonths({ age: 1, ageMonths: 18 })).toBe(18);
    expect(storedTotalAgeMonths({ age: 0, ageMonths: 23 })).toBe(23);
    expect(isHubInfantAgeMonths(storedTotalAgeMonths({ age: 1, ageMonths: 18 }))).toBe(
      true,
    );
  });

  it("prefers live DOB over stale stored years", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    expect(
      resolveTotalAgeMonths(
        { age: 2, ageMonths: 0, dob: "2026-03-19" },
        now,
      ),
    ).toBe(6);
    expect(
      isHubInfantAgeMonths(
        resolveTotalAgeMonths({ age: 2, ageMonths: 0, dob: "2026-03-19" }, now),
      ),
    ).toBe(true);
  });

  it("computes calendar months from DOB with day-of-month decrement", () => {
    const now = new Date("2026-09-19T12:00:00Z");
    expect(monthsFromDob("2026-09-20", now)).toBe(0);
    expect(monthsFromDob("2026-03-19", now)).toBe(6);
    expect(monthsFromDob("2025-09-19", now)).toBe(12);
    expect(monthsFromDob("not-a-date")).toBeNull();
  });

  it("splits total months back into year + remainder", () => {
    expect(agePartsFromTotalMonths(18)).toEqual({ years: 1, months: 6 });
    expect(agePartsFromTotalMonths(23)).toEqual({ years: 1, months: 11 });
    expect(agePartsFromTotalMonths(24)).toEqual({ years: 2, months: 0 });
  });

  it("keeps the Hub infant window exclusive at 24 months", () => {
    expect(isHubInfantAgeMonths(0)).toBe(true);
    expect(isHubInfantAgeMonths(23)).toBe(true);
    expect(isHubInfantAgeMonths(24)).toBe(false);
  });
});
