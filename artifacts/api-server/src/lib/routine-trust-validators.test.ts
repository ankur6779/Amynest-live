import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  runBlockingTrustValidation,
  validateInfantFeedingStructure,
  validateRequiredDinner,
  validateRequiredSleepAnchor,
} from "./routine-trust-validators.js";
import { enforceExtremeAqiSafety } from "./routine-final-integrity.js";
import { parseTimeToMins } from "./routine-scheduler.js";

const baseSleep = 21 * 60;
const baseWake = 7 * 60;

describe("validateRequiredSleepAnchor", () => {
  it("rejects schedule with no bedtime block", () => {
    const r = validateRequiredSleepAnchor(
      [
        { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine", status: "pending" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
      ],
      { wakeMins: baseWake, sleepMins: baseSleep, ageGroup: "early_school", ageInMonths: 96 },
    );
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /missing bedtime/i.test(e)));
  });

  it("rejects bedtime before dinner ends", () => {
    const r = validateRequiredSleepAnchor(
      [
        { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine", status: "pending" },
        { time: "20:30", activity: "Dinner", duration: 40, category: "meal", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: baseWake, sleepMins: baseSleep, ageGroup: "early_school", ageInMonths: 96 },
    );
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /after dinner/i.test(e)));
  });

  it("accepts valid bedtime anchor", () => {
    const r = validateRequiredSleepAnchor(
      [
        { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine", status: "pending" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: baseWake, sleepMins: baseSleep, ageGroup: "early_school", ageInMonths: 96 },
    );
    assert.equal(r.valid, true);
  });
});

describe("validateRequiredDinner", () => {
  it("rejects school-age schedule without dinner", () => {
    const r = validateRequiredDinner(
      [
        { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: baseWake, sleepMins: baseSleep, ageGroup: "early_school", ageInMonths: 96, country: "IN" },
    );
    assert.equal(r.valid, false);
    assert.ok(r.errors.some((e) => /missing dinner/i.test(e)));
  });

  it("skips dinner requirement for infants", () => {
    const r = validateRequiredDinner(
      [
        { time: "07:00", activity: "Feed", duration: 30, category: "feeding", status: "pending" },
        { time: "19:30", activity: "Night sleep", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: 420, sleepMins: 1170, ageGroup: "infant", ageInMonths: 8 },
    );
    assert.equal(r.valid, true);
  });
});

describe("validateInfantFeedingStructure", () => {
  it("rejects 6–12 month schedule without solid exposures", () => {
    const r = validateInfantFeedingStructure(
      [
        { time: "07:00", activity: "Feed", duration: 30, category: "feeding", status: "pending" },
        { time: "19:30", activity: "Night sleep", duration: 30, category: "sleep", status: "pending" },
      ],
      { ageInMonths: 8 },
    );
    assert.equal(r.valid, false);
  });

  it("accepts engine-style Milk & solids feeding path", () => {
    const items = [
      { time: "07:00", activity: "Milk & solids", duration: 30, category: "feeding", status: "pending" },
      { time: "10:00", activity: "Morning nap", duration: 60, category: "nap", status: "pending" },
      { time: "13:00", activity: "Milk & solids", duration: 30, category: "feeding", status: "pending" },
      { time: "16:00", activity: "Milk & solids", duration: 30, category: "feeding", status: "pending" },
      { time: "19:30", activity: "Night sleep", duration: 30, category: "sleep", status: "pending" },
    ];
    const r = validateInfantFeedingStructure(items, { ageInMonths: 8 });
    assert.equal(r.valid, true, r.errors.join("; "));
  });
});

describe("enforceExtremeAqiSafety", () => {
  it("replaces outdoor blocks when AQI >= 300", () => {
    const { items, adjustments } = enforceExtremeAqiSafety(
      [
        { time: "16:00", activity: "Outdoor cricket", duration: 45, category: "outdoor", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: baseWake, sleepMins: baseSleep, aqi: 400, country: "IN" },
    );
    assert.ok(adjustments.length > 0);
    assert.ok(!items.some((i) => /outdoor cricket/i.test(i.activity)));
    assert.ok(items.some((i) => /indoor/i.test(i.activity)));
  });
});

describe("runBlockingTrustValidation adversarial", () => {
  it("blocks no-dinner and no-bedtime cases", () => {
    const noDinner = runBlockingTrustValidation(
      [
        { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: baseWake, sleepMins: baseSleep, ageGroup: "early_school", ageInMonths: 96, country: "IN" },
    );
    assert.equal(noDinner.valid, false);

    const noBed = runBlockingTrustValidation(
      [
        { time: "07:00", activity: "Wake", duration: 30, category: "morning_routine", status: "pending" },
        { time: "19:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
      ],
      { wakeMins: baseWake, sleepMins: baseSleep, ageGroup: "early_school", ageInMonths: 96, country: "IN" },
    );
    assert.equal(noBed.valid, false);
  });
});
