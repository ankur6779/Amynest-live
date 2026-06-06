import { describe, expect, it } from "vitest";
import {
  ageBandToApproxDob,
  getAgeBandOptions,
  getChildNameSuggestions,
  getSchoolSchedulePresets,
  getAgeMilestoneDelightKey,
  getWakeTimeRanges,
  nextStepAfterBirthday,
} from "./onboarding-keyboard-free";

describe("onboarding-keyboard-free", () => {
  it("returns country-specific child name suggestions", () => {
    expect(getChildNameSuggestions("IN")).toContain("Aarav");
    expect(getChildNameSuggestions("US")).toContain("Emma");
    expect(getChildNameSuggestions("ZZ").length).toBeGreaterThan(0);
  });

  it("maps age bands to approximate DOB", () => {
    const dob = ageBandToApproxDob(4, 0);
    expect(dob).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("exposes wake ranges and school presets for tap selection", () => {
    expect(getWakeTimeRanges().length).toBeGreaterThanOrEqual(5);
    expect(getSchoolSchedulePresets().length).toBe(3);
  });

  it("maps age bands to milestone delight copy keys", () => {
    expect(getAgeMilestoneDelightKey(0)).toBe("age_delight_under_1");
    expect(getAgeMilestoneDelightKey(4)).toBe("age_delight_4");
    expect(getAgeMilestoneDelightKey(7)).toBe("age_delight_7");
    expect(getAgeMilestoneDelightKey(8)).toBe("age_delight_8_plus");
  });

  it("uses nine granular age bands and infant branching", () => {
    expect(getAgeBandOptions()).toHaveLength(9);
    expect(nextStepAfterBirthday(6)).toBe("infant-feeding");
    expect(nextStepAfterBirthday(30)).toBe("child-education-stage");
  });
});
