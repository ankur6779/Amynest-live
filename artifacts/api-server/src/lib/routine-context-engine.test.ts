import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineContext } from "./routine-context-builder.js";
import {
  deriveBehavioralState,
  mealWindowsForState,
  resolveContextPriorities,
} from "./routine-context-engine.js";

describe("deriveBehavioralState", () => {
  it("rainy + high energy → indoor-heavy with preferIndoorHighEnergy", () => {
    const state = deriveBehavioralState(
      {
        weatherOutdoor: "no",
        mood: "energetic and hyper",
      },
      { ageGroup: "early_school" },
    );
    assert.equal(state.dayType, "indoor-heavy");
    assert.equal(state.allowOutdoor, false);
    assert.equal(state.preferIndoorHighEnergy, true);
    assert.ok(
      state.decisions.some((d) => d.resolution.includes("indoor high-energy")),
    );
  });

  it("hot day uses avoid_afternoon planning mode", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "AU", weatherOutdoor: "yes", temperatureC: 35 }),
      { ageGroup: "pre_teen" },
    );
    assert.equal(state.dayPlanningMode, "avoid_afternoon");
    assert.equal(state.blockAfternoonOutdoor, true);
    assert.equal(state.repositionOutdoorToMorningEvening, true);
    assert.ok(state.allowOutdoor);
    assert.equal(state.requireHydrationBreak, true);
  });

  it("UAE extreme heat uses evening_only mode", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "AE", temperatureC: 42, weatherOutdoor: "yes" }),
      { ageGroup: "early_school" },
    );
    assert.equal(state.dayPlanningMode, "evening_only");
    assert.equal(state.replaceOutdoorNotShorten, false);
  });

  it("rainy day uses indoor_day and replace-not-shorten", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "US", weatherOutdoor: "no" }),
      { ageGroup: "early_school" },
    );
    assert.equal(state.dayPlanningMode, "indoor_day");
    assert.equal(state.replaceOutdoorNotShorten, true);
    assert.equal(state.allowOutdoor, false);
  });

  it("weekend reduces study blocks", () => {
    const state = deriveBehavioralState(
      { weatherOutdoor: "yes", isWeekendDay: true, hasSchool: false },
      { ageGroup: "early_school" },
    );
    assert.equal(state.reduceStudyBlocks, true);
    assert.ok(state.activityBias === "play" || state.activityBias === "balanced");
  });

  it("school day biases cognitive", () => {
    const state = deriveBehavioralState(
      { weatherOutdoor: "yes", hasSchool: true, isWeekendDay: false },
      { ageGroup: "early_school" },
    );
    assert.equal(state.activityBias, "cognitive");
  });

  it("high environmental risk forces indoor-only", () => {
    const state = deriveBehavioralState(
      { weatherOutdoor: "yes", environmentalRiskScore: 85 },
      { ageGroup: "early_school" },
    );
    assert.equal(state.allowOutdoor, false);
    assert.equal(state.environmentConstraintLevel, "high");
  });
});

describe("mealWindowsForState", () => {
  it("early-dinner profile ends dinner earlier", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "US", weatherOutdoor: "yes" }),
      { ageGroup: "toddler" },
    );
    const windows = mealWindowsForState(state);
    assert.ok(windows.dinner.end <= 20 * 60 + 30);
  });

  it("late-dinner profile allows later dinner", () => {
    const state = deriveBehavioralState(
      { weatherOutdoor: "yes", isWeekendDay: true },
      { ageGroup: "pre_teen" },
    );
    const windows = mealWindowsForState(state);
    assert.ok(windows.dinner.end >= 21 * 60);
  });
});

describe("resolveContextPriorities", () => {
  it("safety beats preference for outdoor access", () => {
    const trace: import("./routine-context-engine.js").ContextDecisionTrace[] = [];
    const resolved = resolveContextPriorities(
      { weatherOutdoor: "no", mood: "energetic" },
      { ageGroup: "early_school", declaredEnergy: "high" },
      trace,
    );
    assert.equal(resolved.allowOutdoor, false);
    assert.equal(resolved.preferIndoorHighEnergy, true);
    assert.ok(trace.some((d) => d.priority === "safety"));
  });
});
