import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveRoutineGenerationInputs } from "./routine-input-validation.js";

describe("resolveRoutineGenerationInputs", () => {
  it("applies safe defaults for missing wake, sleep, school, and weather", () => {
    const { resolved, debug } = resolveRoutineGenerationInputs({
      hasSchool: true,
    });
    assert.equal(resolved.wakeUpTime, "07:00");
    assert.equal(resolved.sleepTime, "21:00");
    assert.equal(resolved.schoolStartTime, "09:00");
    assert.equal(resolved.schoolEndTime, "15:00");
    assert.equal(resolved.weatherOutdoor, "yes");
    assert.equal(resolved.hasSchool, true);
    assert.ok(debug.defaultsApplied.includes("wakeUpTime"));
    assert.ok(debug.defaultsApplied.includes("sleepTime"));
    assert.ok(debug.defaultsApplied.includes("weatherOutdoor"));
  });

  it("preserves explicit special plans and normalizes times", () => {
    const { resolved } = resolveRoutineGenerationInputs({
      wakeUpTime: "7:30 AM",
      sleepTime: "9:00 PM",
      specialPlans: "Doctor at 3pm",
      weatherOutdoor: "limited",
    });
    assert.equal(resolved.wakeUpTime, "07:30");
    assert.equal(resolved.sleepTime, "21:00");
    assert.equal(resolved.specialPlans, "Doctor at 3pm");
    assert.equal(resolved.weatherOutdoor, "limited");
  });
});
