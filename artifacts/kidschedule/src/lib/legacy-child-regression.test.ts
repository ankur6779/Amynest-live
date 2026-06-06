import { describe, expect, it } from "vitest";
import {
  approxDobFromAge,
  deriveSchoolFieldsFromStage,
  resolveEducationStageForPersist,
} from "@workspace/education-stages";
import { hydrateChildEducationFormValues } from "@/lib/education-stage-display";

describe("legacy child regression matrix", () => {
  const scenarios = [
    {
      name: "legacy child with DOB",
      child: {
        educationStage: "school" as const,
        isSchoolGoing: true,
        childClass: "3rd",
        age: 8,
        ageMonths: 0,
        scheduleKnown: false,
      },
      expectedStage: "school",
    },
    {
      name: "legacy child without DOB (age only)",
      child: {
        educationStage: null,
        isSchoolGoing: true,
        childClass: "3rd",
        age: 8,
        ageMonths: 0,
        scheduleKnown: false,
      },
      expectedStage: "school",
    },
    {
      name: "nursery child",
      child: {
        educationStage: "at_home",
        isSchoolGoing: false,
        childClass: "Nursery",
        age: 4,
        ageMonths: 0,
        scheduleKnown: false,
      },
      expectedStage: "nursery",
    },
    {
      name: "LKG child",
      child: {
        educationStage: "at_home",
        isSchoolGoing: false,
        childClass: "LKG / KG",
        age: 4,
        ageMonths: 0,
        scheduleKnown: false,
      },
      expectedStage: "lkg",
    },
    {
      name: "UKG child",
      child: {
        educationStage: "at_home",
        isSchoolGoing: false,
        childClass: "UKG",
        age: 5,
        ageMonths: 0,
        scheduleKnown: false,
      },
      expectedStage: "ukg",
    },
    {
      name: "school child with custom times",
      child: {
        educationStage: "school",
        isSchoolGoing: true,
        childClass: "5th",
        age: 10,
        ageMonths: 0,
        scheduleKnown: false,
      },
      expectedStage: "school",
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
    },
  ] as const;

  for (const scenario of scenarios) {
    it(`${scenario.name}: hydrate infers correct stage`, () => {
      const hydrated = hydrateChildEducationFormValues(scenario.child, "IN");
      expect(hydrated.educationStage).toBe(scenario.expectedStage);
    });

    it(`${scenario.name}: persist does not downgrade stage`, () => {
      const persisted = resolveEducationStageForPersist(
        scenario.child.educationStage,
        scenario.child.isSchoolGoing,
        scenario.child.childClass,
        scenario.child.age,
        scenario.child.ageMonths,
        "IN",
      );
      expect(persisted).toBe(scenario.expectedStage);
    });
  }

  it("age-only legacy child gets approximate DOB for API save", () => {
    const dob = approxDobFromAge(8, 0);
    expect(dob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("school child with custom times survives derive round-trip", () => {
    const derived = deriveSchoolFieldsFromStage({
      educationStage: "school",
      childClass: "5th",
      scheduleKnown: false,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      schoolDays: [1, 2, 3, 4, 5],
      years: 10,
      months: 0,
    });
    expect(derived.schoolStartTime).toBe("08:00");
    expect(derived.schoolEndTime).toBe("14:00");
    expect(derived.educationStage).toBe("school");
  });
});
