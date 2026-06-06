import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enrichChildEducationFields } from "./child-education-enrich.js";

describe("enrichChildEducationFields legacy regression", () => {
  it("upgrades coarse at_home to lkg for legacy LKG child on save", () => {
    const enriched = enrichChildEducationFields(
      {
        age: 4,
        ageMonths: 0,
        educationStage: "at_home",
        isSchoolGoing: false,
        childClass: "LKG / KG",
        scheduleKnown: false,
        schoolStartTime: "09:00",
        schoolEndTime: "15:00",
        schoolDays: null,
      },
      { country: "IN" },
    );
    assert.equal(enriched.educationStage, "lkg");
    assert.equal(enriched.childClass, "LKG / KG");
    assert.equal(enriched.isSchoolGoing, false);
  });

  it("preserves school custom times when scheduleKnown is false", () => {
    const enriched = enrichChildEducationFields({
      age: 8,
      ageMonths: 0,
      educationStage: "school",
      isSchoolGoing: true,
      childClass: "3rd",
      scheduleKnown: false,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      schoolDays: [1, 2, 3, 4, 5],
    });
    assert.equal(enriched.educationStage, "school");
    assert.equal(enriched.schoolStartTime, "08:00");
    assert.equal(enriched.schoolEndTime, "14:00");
    assert.deepEqual(enriched.schoolDays, [1, 2, 3, 4, 5]);
  });

  it("does not downgrade school stage for legacy school-going child", () => {
    const enriched = enrichChildEducationFields({
      age: 8,
      ageMonths: 0,
      educationStage: "school",
      isSchoolGoing: true,
      childClass: "3rd",
      scheduleKnown: false,
      schoolStartTime: "08:00",
      schoolEndTime: "14:00",
      schoolDays: [1, 2, 3, 4, 5],
    });
    assert.equal(enriched.educationStage, "school");
    assert.equal(enriched.isSchoolGoing, true);
  });

  it("infers nursery from legacy childClass when educationStage missing", () => {
    const enriched = enrichChildEducationFields(
      {
        age: 4,
        ageMonths: 0,
        educationStage: null,
        isSchoolGoing: false,
        childClass: "Nursery",
        scheduleKnown: false,
        schoolStartTime: "09:00",
        schoolEndTime: "15:00",
        schoolDays: null,
      },
      { country: "IN" },
    );
    assert.equal(enriched.educationStage, "nursery");
  });

  it("infers ukg from legacy childClass when stored at_home", () => {
    const enriched = enrichChildEducationFields(
      {
        age: 5,
        ageMonths: 0,
        educationStage: "at_home",
        isSchoolGoing: false,
        childClass: "UKG",
        scheduleKnown: false,
        schoolStartTime: "09:00",
        schoolEndTime: "15:00",
        schoolDays: null,
      },
      { country: "IN" },
    );
    assert.equal(enriched.educationStage, "ukg");
  });
});
