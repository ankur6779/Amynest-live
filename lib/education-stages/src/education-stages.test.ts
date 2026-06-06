import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ageBandIdFromYearsMonths,
  approxDobFromAge,
  deriveSchoolFieldsFromStage,
  getEducationStagesForChild,
  inferEducationStageFromLegacy,
  isInfantAge,
  requiresClassSelection,
  requiresScheduleQuestion,
  resolveChildDob,
  yearsMonthsFromAgeBand,
  validateAgeStage,
} from "./index";

describe("education-stages India", () => {
  it("6 months gets at_home and daycare only", () => {
    const stages = getEducationStagesForChild("IN", 0, 6);
    assert.deepEqual(
      stages.map((s) => s.code),
      ["at_home", "daycare"],
    );
    assert.equal(isInfantAge(6), true);
  });

  it("2 years gets playgroup option", () => {
    const stages = getEducationStagesForChild("IN", 2, 0);
    assert.ok(stages.some((s) => s.code === "playgroup"));
    assert.ok(!stages.some((s) => s.code === "school"));
  });

  it("3 years gets nursery not school", () => {
    const stages = getEducationStagesForChild("IN", 3, 0);
    assert.ok(stages.some((s) => s.code === "nursery"));
    assert.ok(!stages.some((s) => s.code === "school"));
  });

  it("4 years gets LKG", () => {
    const stages = getEducationStagesForChild("IN", 4, 0);
    assert.ok(stages.some((s) => s.code === "lkg"));
  });

  it("5 years gets UKG", () => {
    const stages = getEducationStagesForChild("IN", 5, 0);
    assert.ok(stages.some((s) => s.code === "ukg"));
  });

  it("6+ gets homeschool and school", () => {
    const stages = getEducationStagesForChild("IN", 6, 0);
    assert.deepEqual(
      stages.map((s) => s.code),
      ["homeschool", "school"],
    );
    assert.equal(requiresClassSelection("school", 72), true);
    assert.equal(requiresScheduleQuestion("school", 72), true);
  });

  it("rejects age 2 + grade 1", () => {
    const v = validateAgeStage(2, 0, "school", "IN", "1st");
    assert.equal(v.valid, false);
  });

  it("rejects age 1 + nursery", () => {
    const v = validateAgeStage(1, 0, "nursery", "IN");
    assert.equal(v.valid, false);
  });
});

describe("education-stages US", () => {
  it("preschool path for 3 years", () => {
    const stages = getEducationStagesForChild("US", 3, 0);
    assert.ok(stages.some((s) => s.code === "preschool"));
  });

  it("kindergarten for 5 years", () => {
    const stages = getEducationStagesForChild("US", 5, 0);
    assert.ok(stages.some((s) => s.code === "kindergarten"));
  });
});

describe("education-stages UK", () => {
  it("nursery for toddler", () => {
    const stages = getEducationStagesForChild("UK", 3, 0);
    assert.ok(stages.some((s) => s.code === "nursery"));
  });

  it("reception at 5 years", () => {
    const stages = getEducationStagesForChild("UK", 5, 0);
    assert.ok(stages.some((s) => s.code === "reception"));
  });
});

describe("education-stages Australia", () => {
  it("kindy for 4 years", () => {
    const stages = getEducationStagesForChild("AU", 4, 0);
    assert.ok(stages.some((s) => s.code === "kindy"));
  });

  it("prep at 5 years", () => {
    const stages = getEducationStagesForChild("AU", 5, 0);
    assert.ok(stages.some((s) => s.code === "prep"));
  });
});

describe("derive and legacy", () => {
  it("LKG stage maps childClass", () => {
    const d = deriveSchoolFieldsFromStage({
      educationStage: "lkg",
      years: 4,
      months: 0,
    });
    assert.equal(d.childClass, "LKG / KG");
    assert.equal(d.isSchoolGoing, false);
    assert.equal(d.schoolDays, null);
  });

  it("school with schedule later uses defaults", () => {
    const d = deriveSchoolFieldsFromStage({
      educationStage: "school",
      childClass: "3rd",
      scheduleKnown: false,
      years: 8,
      months: 0,
    });
    assert.equal(d.isSchoolGoing, true);
    assert.equal(d.scheduleKnown, false);
    assert.deepEqual(d.schoolDays, [1, 2, 3, 4, 5]);
  });

  it("legacy LKG maps to lkg stage", () => {
    assert.equal(
      inferEducationStageFromLegacy(false, "LKG / KG", 4, 0, "IN"),
      "lkg",
    );
  });

  it("legacy school-going 8yo maps to school", () => {
    assert.equal(
      inferEducationStageFromLegacy(true, "3rd", 8, 0, "IN"),
      "school",
    );
  });
});

describe("age-dob resolution", () => {
  it("maps years to stable age-band ids", () => {
    assert.equal(ageBandIdFromYearsMonths(0, 6), "under_1");
    assert.equal(ageBandIdFromYearsMonths(4, 0), "y4");
    assert.equal(ageBandIdFromYearsMonths(8, 0), "y8_plus");
  });

  it("resolves DOB with exact dob first, then age band fallback", () => {
    assert.equal(
      resolveChildDob({ dob: "2020-05-15", age: 4, selectedAgeBand: "y4" }),
      "2020-05-15",
    );
    assert.match(resolveChildDob({ selectedAgeBand: "y4" }), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(resolveChildDob({ age: 2, ageMonths: 0 }), /^\d{4}-\d{2}-\d{2}$/);
  });

  it("approximates DOB for age 4 from reference date", () => {
    const ref = new Date("2026-06-06T12:00:00Z");
    assert.match(approxDobFromAge(4, 0, ref), /^2022-/);
    assert.deepEqual(yearsMonthsFromAgeBand("y6"), { years: 6, months: 0 });
  });
});
