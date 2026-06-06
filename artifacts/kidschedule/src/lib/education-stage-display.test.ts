import { describe, it, expect } from "vitest";
import {
  childShowsFormalSchoolSchedule,
  hydrateChildEducationFormValues,
  profileFormStageFlags,
  resolveChildEducationStage,
} from "@/lib/education-stage-display";

describe("education-stage-display", () => {
  it("infers nursery from legacy childClass", () => {
    expect(
      resolveChildEducationStage({
        educationStage: null,
        isSchoolGoing: false,
        childClass: "Nursery",
        age: 4,
        ageMonths: 0,
        country: "IN",
      }),
    ).toBe("nursery");
  });

  it("preserves explicit educationStage on hydrate", () => {
    const hydrated = hydrateChildEducationFormValues(
      {
        educationStage: "lkg",
        isSchoolGoing: false,
        childClass: "LKG / KG",
        age: 5,
        ageMonths: 0,
      },
      "IN",
    );
    expect(hydrated.educationStage).toBe("lkg");
    expect(hydrated.childClass).toBe("LKG / KG");
  });

  it("school stage shows class and schedule section at age 7", () => {
    const flags = profileFormStageFlags("school", 84);
    expect(flags.showClass).toBe(true);
    expect(flags.showScheduleSection).toBe(true);
  });

  it("nursery does not show class or schedule section", () => {
    const flags = profileFormStageFlags("nursery", 48);
    expect(flags.showClass).toBe(false);
    expect(flags.showScheduleSection).toBe(false);
  });

  it("formal schedule only when scheduleKnown", () => {
    expect(
      childShowsFormalSchoolSchedule({
        educationStage: "school",
        age: 8,
        scheduleKnown: true,
      }),
    ).toBe(true);
    expect(
      childShowsFormalSchoolSchedule({
        educationStage: "school",
        age: 8,
        scheduleKnown: false,
      }),
    ).toBe(false);
  });
});
