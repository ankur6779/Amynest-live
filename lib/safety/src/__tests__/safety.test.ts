import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyAgeBand,
  validateRoutine,
  computeSafetyScore,
} from "../index.js";
import type {
  RoutineActivityInput,
  SafetyValidationInput,
} from "../index.js";

const act = (
  o: Partial<RoutineActivityInput> & { id: string },
): RoutineActivityInput => ({
  title: "Activity",
  startMinutes: 0,
  durationMinutes: 30,
  category: "general",
  ...o,
});

const baseInput = (
  overrides: Partial<SafetyValidationInput> = {},
): SafetyValidationInput => ({
  ageBand: "school",
  ageMonths: 84,
  activities: [],
  totalScreenMinutes: 0,
  totalSleepMinutes: 600,
  totalOutdoorMinutes: 60,
  caregiverPresent: true,
  ...overrides,
});

describe("classifyAgeBand", () => {
  it("classifies infant under 18 months", () => {
    assert.equal(classifyAgeBand(0), "infant");
    assert.equal(classifyAgeBand(17), "infant");
  });
  it("classifies toddler 18-36 months", () => {
    assert.equal(classifyAgeBand(18), "toddler");
    assert.equal(classifyAgeBand(35), "toddler");
  });
  it("classifies preschool 36-60 months", () => {
    assert.equal(classifyAgeBand(36), "preschool");
    assert.equal(classifyAgeBand(59), "preschool");
  });
  it("classifies school 60-132 months", () => {
    assert.equal(classifyAgeBand(60), "school");
    assert.equal(classifyAgeBand(131), "school");
  });
  it("classifies tween 132+ months", () => {
    assert.equal(classifyAgeBand(132), "tween");
    assert.equal(classifyAgeBand(180), "tween");
  });
});

describe("computeSafetyScore", () => {
  it("returns 100 for no violations", () => {
    assert.equal(computeSafetyScore([]), 100);
  });
  it("subtracts 5 for info violation", () => {
    assert.equal(
      computeSafetyScore([
        { ruleId: "x", category: "screen_time", severity: "info", message: "", affectedActivityIds: [] },
      ]),
      95,
    );
  });
  it("subtracts 15 for warning violation", () => {
    assert.equal(
      computeSafetyScore([
        { ruleId: "x", category: "sleep_safety", severity: "warning", message: "", affectedActivityIds: [] },
      ]),
      85,
    );
  });
  it("subtracts 35 for critical violation", () => {
    assert.equal(
      computeSafetyScore([
        { ruleId: "x", category: "supervision", severity: "critical", message: "", affectedActivityIds: [] },
      ]),
      65,
    );
  });
  it("clamps score to 0 minimum", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      ruleId: `r${i}`,
      category: "supervision" as const,
      severity: "critical" as const,
      message: "",
      affectedActivityIds: [],
    }));
    assert.equal(computeSafetyScore(many), 0);
  });
});

describe("validateRoutine — sleep safety", () => {
  it("flags infant with insufficient sleep as critical", () => {
    const result = validateRoutine(
      baseInput({ ageBand: "infant", ageMonths: 6, totalSleepMinutes: 600 }),
    );
    const sleepV = result.violations.find((v) => v.category === "sleep_safety");
    assert.ok(sleepV);
    assert.equal(sleepV.severity, "critical");
    assert.equal(result.isValid, false);
  });
  it("passes infant with sufficient sleep", () => {
    const result = validateRoutine(
      baseInput({
        ageBand: "infant",
        ageMonths: 6,
        totalSleepMinutes: 900,
        caregiverPresent: true,
      }),
    );
    const sleepV = result.violations.find((v) => v.category === "sleep_safety");
    assert.equal(sleepV, undefined);
  });
  it("flags school-age with low sleep as warning", () => {
    const result = validateRoutine(
      baseInput({ totalSleepMinutes: 400 }),
    );
    const sleepV = result.violations.find((v) => v.category === "sleep_safety");
    assert.ok(sleepV);
    assert.equal(sleepV.severity, "warning");
  });
});

describe("validateRoutine — screen time", () => {
  it("flags infant with any screen time as critical", () => {
    const result = validateRoutine(
      baseInput({
        ageBand: "infant",
        ageMonths: 6,
        totalScreenMinutes: 30,
        totalSleepMinutes: 900,
      }),
    );
    const screenV = result.violations.find((v) => v.category === "screen_time");
    assert.ok(screenV);
    assert.equal(screenV.severity, "critical");
  });
  it("flags toddler over 60 min screen time as warning", () => {
    const result = validateRoutine(
      baseInput({
        ageBand: "toddler",
        ageMonths: 24,
        totalScreenMinutes: 90,
        totalSleepMinutes: 720,
      }),
    );
    const screenV = result.violations.find((v) => v.category === "screen_time");
    assert.ok(screenV);
    assert.equal(screenV.severity, "warning");
  });
  it("passes school-age under 120 min screen time", () => {
    const result = validateRoutine(baseInput({ totalScreenMinutes: 90 }));
    const screenV = result.violations.find((v) => v.category === "screen_time");
    assert.equal(screenV, undefined);
  });
  it("attaches affected screen activity ids", () => {
    const result = validateRoutine(
      baseInput({
        ageBand: "toddler",
        ageMonths: 24,
        totalScreenMinutes: 90,
        totalSleepMinutes: 720,
        activities: [
          act({ id: "a1", title: "TV time", category: "screen", durationMinutes: 90 }),
          act({ id: "a2", title: "Lunch", category: "meal" }),
        ],
      }),
    );
    const screenV = result.violations.find((v) => v.category === "screen_time")!;
    assert.deepEqual(screenV.affectedActivityIds, ["a1"]);
  });
});

describe("validateRoutine — activity intensity", () => {
  it("blocks high-intensity for infants", () => {
    const result = validateRoutine(
      baseInput({
        ageBand: "infant",
        ageMonths: 6,
        totalSleepMinutes: 900,
        activities: [act({ id: "a1", intensity: "high", title: "Running" })],
      }),
    );
    const intensityV = result.violations.find(
      (v) => v.category === "activity_intensity",
    );
    assert.ok(intensityV);
    assert.equal(intensityV.severity, "critical");
    assert.deepEqual(intensityV.affectedActivityIds, ["a1"]);
  });
  it("flags toddler high-intensity blocks over 20 min", () => {
    const result = validateRoutine(
      baseInput({
        ageBand: "toddler",
        ageMonths: 24,
        totalSleepMinutes: 720,
        activities: [
          act({ id: "a1", intensity: "high", durationMinutes: 30, title: "Run" }),
        ],
      }),
    );
    const intensityV = result.violations.find(
      (v) => v.category === "activity_intensity",
    );
    assert.ok(intensityV);
  });
  it("flags total active time over cap for school-age", () => {
    const result = validateRoutine(
      baseInput({
        activities: [
          act({ id: "a1", intensity: "high", durationMinutes: 200, title: "Soccer" }),
          act({ id: "a2", intensity: "moderate", durationMinutes: 200, title: "Swim" }),
        ],
      }),
    );
    const overV = result.violations.find((v) => v.ruleId === "activity_overload");
    assert.ok(overV);
  });
});

describe("validateRoutine — supervision", () => {
  it("flags infant without caregiver as critical", () => {
    const result = validateRoutine(
      baseInput({
        ageBand: "infant",
        ageMonths: 6,
        totalSleepMinutes: 900,
        caregiverPresent: false,
      }),
    );
    const supV = result.violations.find((v) => v.category === "supervision");
    assert.ok(supV);
    assert.equal(supV.severity, "critical");
    assert.equal(result.isValid, false);
  });
  it("does not flag school-age without caregiver", () => {
    const result = validateRoutine(baseInput({ caregiverPresent: false }));
    const supV = result.violations.find((v) => v.category === "supervision");
    assert.equal(supV, undefined);
  });
});

describe("validateRoutine — outdoor exposure", () => {
  it("flags school-age with under 30 min outdoor as info", () => {
    const result = validateRoutine(baseInput({ totalOutdoorMinutes: 10 }));
    const outV = result.violations.find((v) => v.category === "outdoor_exposure");
    assert.ok(outV);
    assert.equal(outV.severity, "info");
  });
  it("passes school-age with sufficient outdoor", () => {
    const result = validateRoutine(baseInput({ totalOutdoorMinutes: 45 }));
    const outV = result.violations.find((v) => v.category === "outdoor_exposure");
    assert.equal(outV, undefined);
  });
});

describe("validateRoutine — nutrition", () => {
  it("flags school-age with fewer than 3 meals", () => {
    const result = validateRoutine(
      baseInput({
        activities: [act({ id: "a1", title: "Breakfast", category: "meal" })],
      }),
    );
    const nutV = result.violations.find((v) => v.category === "nutrition_balance");
    assert.ok(nutV);
  });
  it("passes school-age with 3 meals", () => {
    const result = validateRoutine(
      baseInput({
        activities: [
          act({ id: "a1", title: "Breakfast", category: "meal" }),
          act({ id: "a2", title: "Lunch", category: "meal" }),
          act({ id: "a3", title: "Dinner", category: "meal" }),
        ],
      }),
    );
    const nutV = result.violations.find((v) => v.category === "nutrition_balance");
    assert.equal(nutV, undefined);
  });
});

describe("validateRoutine — overall result", () => {
  it("returns isValid=true when only warnings/info present", () => {
    const result = validateRoutine(baseInput({ totalOutdoorMinutes: 5 }));
    assert.equal(result.isValid, true);
  });
  it("returns isValid=false when any critical present", () => {
    const result = validateRoutine(
      baseInput({
        ageBand: "infant",
        ageMonths: 6,
        totalSleepMinutes: 0,
        caregiverPresent: false,
      }),
    );
    assert.equal(result.isValid, false);
  });
  it("includes appliedRuleIds matching age band", () => {
    const result = validateRoutine(baseInput());
    assert.ok(result.appliedRuleIds.includes("sleep_min_school"));
    assert.ok(result.appliedRuleIds.includes("screen_max_school"));
    assert.ok(!result.appliedRuleIds.includes("sleep_min_infant"));
  });
  it("returns suggested adjustments tied to violations", () => {
    const result = validateRoutine(baseInput({ totalSleepMinutes: 400 }));
    assert.ok(result.adjustments.length > 0);
    assert.ok(result.adjustments[0].suggestion.length > 0);
  });
  it("returns 100 score for clean routine", () => {
    const result = validateRoutine(
      baseInput({
        activities: [
          act({ id: "a1", title: "Breakfast", category: "meal" }),
          act({ id: "a2", title: "Lunch", category: "meal" }),
          act({ id: "a3", title: "Dinner", category: "meal" }),
        ],
      }),
    );
    assert.equal(result.safetyScore, 100);
    assert.equal(result.isValid, true);
  });
});
