import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineContext } from "./routine-context-builder.js";
import {
  assessEnvironment,
  deriveEnvironmentSeverity,
} from "./routine-environment-intelligence.js";

describe("deriveEnvironmentSeverity", () => {
  it("rates India hazardous AQI as high", () => {
    const ctx = buildRoutineContext({
      country: "IN",
      weatherOutdoor: "yes",
      temperatureC: 28,
      environment: { AQI: 280 },
    });
    assert.equal(deriveEnvironmentSeverity(ctx, "IN"), "high");
  });

  it("rates mild weather as low", () => {
    const ctx = buildRoutineContext({
      country: "NZ",
      weatherOutdoor: "yes",
      temperatureC: 18,
      environment: { AQI: 45 },
    });
    assert.equal(deriveEnvironmentSeverity(ctx, "NZ"), "low");
  });
});

describe("assessEnvironment", () => {
  it("maps high severity + rain to indoor_day", () => {
    const ctx = buildRoutineContext({
      country: "US",
      weatherOutdoor: "no",
      temperatureC: 12,
      environment: { AQI: 40 },
    });
    const a = assessEnvironment(ctx, "US");
    assert.equal(a.dayPlanningMode, "indoor_day");
  });

  it("maps UAE heat to evening_only", () => {
    const ctx = buildRoutineContext({
      country: "AE",
      weatherOutdoor: "limited",
      temperatureC: 42,
      hydrationNeedLevel: "extreme",
      environment: { AQI: 180 },
    });
    const a = assessEnvironment(ctx, "AE");
    assert.equal(a.severity, "high");
    assert.equal(a.dayPlanningMode, "evening_only");
  });
});
