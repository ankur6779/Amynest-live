import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateValidatedInfantRoutine } from "./infant-adaptive-routine.js";
import { enforceSleepBoundary } from "./routine-final-integrity.js";
import { runRoutineIntelligencePipeline } from "./routine-intelligence-pipeline.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { parseTimeToMins, isNapItem } from "./routine-scheduler.js";
import { validateInfantPipelineSchedule } from "./routine-infant-schedule-validation.js";

describe("validateInfantPipelineSchedule", () => {
  it("passes when naps and bedtime are intact", () => {
    const validated = generateValidatedInfantRoutine({
      ageMonths: 8,
      wakeTime: "07:00",
      sleepTime: "19:30",
      feedingType: "mixed",
    });
    let items = validated.result.items;
    items = enforceSleepBoundary(
      items,
      parseTimeToMins("19:30"),
      parseTimeToMins("07:00"),
    ).items;
    const result = validateInfantPipelineSchedule(items, {
      ageMonths: 8,
      wakeMins: parseTimeToMins("07:00"),
      sleepMins: parseTimeToMins("19:30"),
    });
    assert.equal(result.valid, true, result.errors.join("; "));
    assert.ok(items.filter(isNapItem).length >= 1);
  });

  it("fails when naps are stripped", () => {
    const result = validateInfantPipelineSchedule(
      [
        { time: "07:00", activity: "Feed", duration: 30, category: "feeding", status: "pending" },
        { time: "19:30", activity: "Night sleep", duration: 30, category: "sleep", status: "pending" },
      ],
      { ageMonths: 8, wakeMins: parseTimeToMins("07:00"), sleepMins: parseTimeToMins("19:30") },
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => /nap/i.test(e)));
  });
});

describe("infant pipeline nap survival", () => {
  it("6–11 month path retains naps through enforceSleepBoundary", () => {
    const ctx = buildRoutineContext({
      country: "IN",
      hasSchool: false,
      mood: "normal",
      weatherOutdoor: "yes",
      temperatureC: 30,
    });
    const pipeline = runRoutineIntelligencePipeline({
      items: [],
      scheduleOpts: {
        wakeUpTime: "07:00",
        sleepTime: "19:30",
        ageGroup: "infant",
        hasSchool: false,
        schoolStartMins: 540,
        schoolEndMins: 900,
      },
      builtContext: ctx,
      childProfile: { ageGroup: "infant", ageInMonths: 8, feedingType: "mixed" },
      mealSeed: 42,
      isVeg: true,
    });
    assert.ok(pipeline.items.filter(isNapItem).length >= 1);
    assert.equal(pipeline.validated, true);
  });
});
