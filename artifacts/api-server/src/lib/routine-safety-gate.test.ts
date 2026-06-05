import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  enforceRoutineSafety,
  partialRegenAllowedForAge,
  PARTIAL_REGEN_MIN_AGE_MONTHS,
} from "./routine-safety-gate.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

// early_school (age 96mo), country US:
//   dinner window 17:30–19:00, bedtime window 19:30–22:30, sleep anchor 20:00.
const SLEEP_MINS = 20 * 60; // 1200
const WAKE_MINS = 7 * 60;

function validSchoolItems(): RoutineScheduleItem[] {
  return [
    { time: "07:00", activity: "Wake up & morning routine", duration: 30, category: "self_care", status: "pending" },
    { time: "18:00", activity: "Dinner", duration: 30, category: "meal", status: "pending" },
    { time: "20:00", activity: "Bedtime", duration: 30, category: "sleep", status: "pending" },
  ] as RoutineScheduleItem[];
}

const SCHOOL_OPTS = {
  wakeMins: WAKE_MINS,
  sleepMins: SLEEP_MINS,
  ageGroup: "early_school" as const,
  ageInMonths: 96,
  country: "US",
};

describe("partialRegenAllowedForAge (P0-2 infant block)", () => {
  it("blocks children under 36 months", () => {
    assert.equal(partialRegenAllowedForAge(0), false);
    assert.equal(partialRegenAllowedForAge(10), false);
    assert.equal(partialRegenAllowedForAge(35), false);
  });

  it("allows children 36 months and older", () => {
    assert.equal(partialRegenAllowedForAge(PARTIAL_REGEN_MIN_AGE_MONTHS), true);
    assert.equal(partialRegenAllowedForAge(48), true);
    assert.equal(partialRegenAllowedForAge(120), true);
  });

  it("treats missing age as not allowed (fail closed)", () => {
    assert.equal(partialRegenAllowedForAge(null), false);
    assert.equal(partialRegenAllowedForAge(undefined), false);
  });
});

describe("enforceRoutineSafety — trust validation", () => {
  it("passes a complete school-age routine", () => {
    const result = enforceRoutineSafety(validSchoolItems(), SCHOOL_OPTS);
    assert.equal(result.valid, true);
    assert.deepEqual(result.errors, []);
  });

  it("(P0-3 bedtime) fails when the bedtime sleep anchor is missing", () => {
    const items = validSchoolItems().filter(
      (i) => (i.category ?? "").toLowerCase() !== "sleep",
    );
    const result = enforceRoutineSafety(items, SCHOOL_OPTS);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => /trust-sleep: missing bedtime/i.test(e)),
      `expected missing-bedtime error, got: ${result.errors.join(" | ")}`,
    );
  });

  it("(P0-3 dinner) fails when dinner is missing for a 36mo+ child", () => {
    const items = validSchoolItems().filter(
      (i) => !/dinner/i.test(i.activity),
    );
    const result = enforceRoutineSafety(items, SCHOOL_OPTS);
    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => /trust-dinner: missing dinner/i.test(e)),
      `expected missing-dinner error, got: ${result.errors.join(" | ")}`,
    );
  });

  it("(P0-3 trust-failed never returned) reports invalid for an empty/broken routine", () => {
    // Caller contract: when valid === false the route must NOT return/persist.
    const result = enforceRoutineSafety(
      [
        { time: "08:00", activity: "Free play", duration: 60, category: "play", status: "pending" },
      ] as RoutineScheduleItem[],
      SCHOOL_OPTS,
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.length >= 2, "expected multiple trust failures");
  });
});

describe("enforceRoutineSafety — AQI enforcement (P0-1)", () => {
  it("removes outdoor blocks at AQI 300+ while keeping the routine valid", () => {
    const items: RoutineScheduleItem[] = [
      ...validSchoolItems(),
      { time: "16:00", activity: "Outdoor play in the park", duration: 45, category: "outdoor", status: "pending" },
    ] as RoutineScheduleItem[];

    const result = enforceRoutineSafety(items, { ...SCHOOL_OPTS, aqi: 350 });

    assert.equal(result.valid, true);
    assert.equal(
      result.items.some((i) => /outdoor play in the park/i.test(i.activity)),
      false,
      "outdoor block should be removed at AQI 350",
    );
    assert.ok(
      result.adjustments.some((a) => /removed outdoor/i.test(a)),
      `expected an AQI removal adjustment, got: ${result.adjustments.join(" | ")}`,
    );
  });

  it("keeps outdoor blocks when AQI is good", () => {
    const items: RoutineScheduleItem[] = [
      ...validSchoolItems(),
      { time: "16:00", activity: "Outdoor play in the park", duration: 45, category: "outdoor", status: "pending" },
    ] as RoutineScheduleItem[];

    const result = enforceRoutineSafety(items, { ...SCHOOL_OPTS, aqi: 40 });

    assert.equal(result.valid, true);
    assert.equal(
      result.items.some((i) => /outdoor play in the park/i.test(i.activity)),
      true,
    );
  });

  it("validate-only mode skips AQI mutation", () => {
    const items: RoutineScheduleItem[] = [
      ...validSchoolItems(),
      { time: "16:00", activity: "Outdoor play in the park", duration: 45, category: "outdoor", status: "pending" },
    ] as RoutineScheduleItem[];

    const result = enforceRoutineSafety(items, {
      ...SCHOOL_OPTS,
      aqi: 350,
      skipAqiEnforcement: true,
    });

    assert.equal(result.adjustments.length, 0);
    assert.equal(
      result.items.some((i) => /outdoor play in the park/i.test(i.activity)),
      true,
      "outdoor block should remain when AQI enforcement is skipped",
    );
  });
});

describe("enforceRoutineSafety — infant feeding (P0-2 validators)", () => {
  it("fails an infant routine that contains an adult dinner and no feeds", () => {
    const infantItems: RoutineScheduleItem[] = [
      { time: "07:00", activity: "Wake up", duration: 15, category: "self_care", status: "pending" },
      { time: "18:00", activity: "Dinner", duration: 30, category: "meal", status: "pending" },
      { time: "19:00", activity: "Bedtime", duration: 30, category: "sleep", status: "pending" },
    ] as RoutineScheduleItem[];

    const result = enforceRoutineSafety(infantItems, {
      wakeMins: WAKE_MINS,
      sleepMins: 19 * 60,
      ageGroup: "infant",
      ageInMonths: 5,
      country: "US",
    });

    assert.equal(result.valid, false);
    assert.ok(
      result.errors.some((e) => /trust-feeding/i.test(e)),
      `expected feeding-structure errors, got: ${result.errors.join(" | ")}`,
    );
  });
});
