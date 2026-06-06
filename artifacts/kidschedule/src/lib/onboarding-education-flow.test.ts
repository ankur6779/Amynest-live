import { describe, it } from "vitest";
import { expect } from "vitest";
import {
  getEducationStagesForChild,
  getTotalMonths,
  isInfantAge,
  nextStepAfterDob,
  nextStepAfterEducationStage,
  nextStepAfterScheduleKnown,
  requiresClassSelection,
  requiresScheduleQuestion,
} from "@workspace/education-stages";

function stageCodes(country: string, years: number, months = 0): string[] {
  return getEducationStagesForChild(country, years, months).map((s) => s.code);
}

describe("onboarding education flow scenarios", () => {
  describe("India", () => {
    it("6 months: infant path, no school/class/timing", () => {
      const total = getTotalMonths(0, 6);
      expect(isInfantAge(total)).toBe(true);
      expect(nextStepAfterDob(total)).toBe("infant-feeding");
      expect(stageCodes("IN", 0, 6)).toEqual(["at_home", "daycare"]);
      expect(stageCodes("IN", 0, 6)).not.toContain("school");
    });

    it("2 years: playgroup, no class", () => {
      expect(stageCodes("IN", 2, 0)).toContain("playgroup");
      expect(requiresClassSelection("playgroup", 24)).toBe(false);
      expect(nextStepAfterEducationStage("playgroup", 24)).toBe("child-wake");
    });

    it("3 years: nursery", () => {
      expect(stageCodes("IN", 3, 0)).toContain("nursery");
      expect(stageCodes("IN", 3, 0)).not.toContain("school");
    });

    it("4 years: LKG", () => {
      expect(stageCodes("IN", 4, 0)).toContain("lkg");
    });

    it("5 years: UKG", () => {
      expect(stageCodes("IN", 5, 0)).toContain("ukg");
    });

    it("6 years: school requires class + schedule question", () => {
      const total = getTotalMonths(6, 0);
      expect(stageCodes("IN", 6, 0)).toEqual(["homeschool", "school"]);
      expect(nextStepAfterEducationStage("school", total)).toBe("child-class-grade");
      expect(requiresScheduleQuestion("school", total)).toBe(true);
      expect(nextStepAfterScheduleKnown(false, "school", total)).toBe("child-wake");
      expect(nextStepAfterScheduleKnown(true, "school", total)).toBe("child-school-start");
    });

    it("10 years: school only with class", () => {
      expect(stageCodes("IN", 10, 0)).toEqual(["homeschool", "school"]);
    });
  });

  describe("US", () => {
    it("preschool at 3 years", () => {
      expect(stageCodes("US", 3, 0)).toContain("preschool");
    });

    it("kindergarten at 5 years", () => {
      expect(stageCodes("US", 5, 0)).toContain("kindergarten");
    });

    it("grade 1+ at 6 years", () => {
      expect(stageCodes("US", 6, 0)).toContain("school");
    });
  });

  describe("UK", () => {
    it("nursery for 3 years", () => {
      expect(stageCodes("UK", 3, 0)).toContain("nursery");
    });

    it("reception at 5 years", () => {
      expect(stageCodes("UK", 5, 0)).toContain("reception");
    });
  });

  describe("Australia", () => {
    it("kindy at 4 years", () => {
      expect(stageCodes("AU", 4, 0)).toContain("kindy");
    });

    it("prep at 5 years", () => {
      expect(stageCodes("AU", 5, 0)).toContain("prep");
    });
  });
});
