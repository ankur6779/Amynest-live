import { describe, expect, it } from "vitest";
import {
  buildChildEducationPatchKey,
  buildChildHydrationKey,
  childFormResetValuesEqual,
  educationFieldsEqual,
  infantFormNormalizationPatches,
} from "@/lib/child-form-hydration";

describe("child-form-hydration", () => {
  it("builds stable hydration keys immune to react-query refetch churn", () => {
    const key1 = buildChildHydrationKey(42, "2024-06-01", "IN");
    const key2 = buildChildHydrationKey(42, "2024-06-01", "IN");
    expect(key1).toBe(key2);
    expect(key1).toBe("42:2024-06-01:IN");
    expect(key1).not.toContain("updatedAt");
    expect(key1).not.toContain("Mia");
  });

  it("detects country-only education patch key", () => {
    expect(buildChildEducationPatchKey(7, "2020-01-15")).toBe("7:2020-01-15");
  });

  it("skips infant setValue patches when already normalized", () => {
    expect(
      infantFormNormalizationPatches(true, {
        educationStage: "at_home",
        scheduleKnown: false,
      }),
    ).toBeNull();
  });

  it("patches infant stage when school values remain", () => {
    expect(
      infantFormNormalizationPatches(true, {
        educationStage: "school",
        scheduleKnown: true,
      }),
    ).toEqual({ educationStage: "at_home", scheduleKnown: false });
  });

  it("detects equal reset payloads to skip form.reset", () => {
    const base = {
      name: "Mia",
      dob: "2024-06-01",
      educationStage: "at_home",
      scheduleKnown: false,
      childClass: "",
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      schoolStartTime: "08:00",
      schoolEndTime: "15:00",
      schoolDays: [1, 2, 3, 4, 5],
      travelMode: "car",
      travelModeOther: "",
      foodType: "veg",
      goals: "",
      babysitterId: undefined,
    };
    expect(childFormResetValuesEqual(base, { ...base })).toBe(true);
    expect(childFormResetValuesEqual(base, { ...base, name: "Leo" })).toBe(false);
  });

  it("compares education fields for country-only patch", () => {
    expect(
      educationFieldsEqual(
        { educationStage: "school", scheduleKnown: true, childClass: "3" },
        { educationStage: "school", scheduleKnown: true, childClass: "3" },
      ),
    ).toBe(true);
    expect(
      educationFieldsEqual(
        { educationStage: "school", scheduleKnown: true, childClass: "3" },
        { educationStage: "school", scheduleKnown: true, childClass: "4" },
      ),
    ).toBe(false);
  });
});
