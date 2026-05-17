import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import {
  generateRoutineFromState,
  validateAgainstInterpretedState,
} from "./routine-decision-engine.js";
import { logRoutineOutcome, getRoutineOutcomeStore } from "./routine-outcome-log.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("generateRoutineFromState", () => {
  const baseItems = [
    { time: "07:00", activity: "Wake up", duration: 30, category: "morning_routine" },
    { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
    { time: "10:00", activity: "Homework", duration: 45, category: "study" },
    { time: "11:00", activity: "Extra study", duration: 45, category: "study" },
    { time: "15:00", activity: "Park play", duration: 60, category: "outdoor" },
    { time: "19:00", activity: "Dinner", duration: 35, category: "meal" },
    { time: "21:00", activity: "Sleep", duration: 30, category: "sleep" },
  ];

  const scheduleOpts = {
    wakeUpTime: "07:00",
    sleepTime: "21:00",
    ageGroup: "early_school" as const,
  };

  it("removes outdoor on rainy day and attaches decision reason", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({
        country: "US",
        weatherOutdoor: "no",
        mood: "energetic",
        hasSchool: false,
      }),
      { ageGroup: "early_school" },
    );
    const { items, validationWarnings } = generateRoutineFromState(
      baseItems,
      state,
      scheduleOpts,
    );
    const outdoorContradictions = validationWarnings.filter((w) =>
      /contradiction:.*outdoor/i.test(w),
    );
    assert.equal(outdoorContradictions.length, 0, outdoorContradictions.join("; "));
    const outdoor = items.filter((i) => (i.category ?? "").toLowerCase() === "outdoor");
    assert.equal(outdoor.length, 0);
    const highEnergy = items.find((i) =>
      /obstacle|dance|sports circuit/i.test(i.activity),
    );
    assert.ok(highEnergy);
    assert.ok(highEnergy?.scheduleDecision?.reason);
    assert.equal(highEnergy?.scheduleDecision?.source, "safety");
  });

  it("repositions long play on hot days (morning/evening, not afternoon)", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({
        country: "US",
        weatherOutdoor: "yes",
        temperatureC: 36,
        hasSchool: false,
      }),
      { ageGroup: "early_school" },
    );
    const hotItems = [
      ...baseItems.filter((i) => i.category !== "outdoor"),
      { time: "16:00", activity: "Outdoor play", duration: 50, category: "play" },
      baseItems[baseItems.length - 1]!,
    ];
    const { items } = generateRoutineFromState(hotItems, state, scheduleOpts);
    const repositioned = items.filter((i) => /\(morning\)|\(evening\)/i.test(i.activity));
    assert.ok(repositioned.length >= 1, `expected repositioned play, got ${repositioned.length}`);
    const afternoonActive = items.filter((i) => {
      const start = parseTimeToMins(i.time);
      if (start < 12 * 60 || start >= 17 * 60 + 30) return false;
      if ((i.category ?? "").toLowerCase() === "meal") return false;
      const cat = (i.category ?? "").toLowerCase();
      return (
        cat === "outdoor" ||
        cat === "play" ||
        (cat === "exercise" && /soccer|football|sports|outdoor/i.test(i.activity))
      );
    });
    assert.equal(afternoonActive.length, 0, afternoonActive.map((i) => i.activity).join(", "));
  });

  it("reduces study blocks on weekend", () => {
    const state = deriveBehavioralState(
      buildRoutineContext({ country: "US", weatherOutdoor: "yes", isWeekendDay: true }),
      { ageGroup: "early_school" },
    );
    const { items } = generateRoutineFromState(baseItems, state, scheduleOpts);
    const study = items.filter((i) => i.category === "study");
    assert.ok(study.length <= 1);
  });

  it("anchors wake and sleep", () => {
    const state = deriveBehavioralState(
      { weatherOutdoor: "yes" },
      { ageGroup: "early_school" },
    );
    const { items } = generateRoutineFromState(baseItems, state, scheduleOpts);
    const first = items.find((i) => i.category !== "sleep")!;
    const sleep = items.find((i) => i.category === "sleep")!;
    assert.equal(parseTimeToMins(first.time), 7 * 60);
    assert.equal(parseTimeToMins(sleep.time), 21 * 60);
  });
});

describe("validateAgainstInterpretedState", () => {
  it("flags outdoor items on indoor-heavy days", () => {
    const state = deriveBehavioralState(
      { weatherOutdoor: "no" },
      { ageGroup: "early_school" },
    );
    const warnings = validateAgainstInterpretedState(
      [{ time: "15:00", activity: "Park", duration: 30, category: "outdoor" }],
      state,
    );
    assert.ok(warnings.length > 0);
  });
});

describe("logRoutineOutcome", () => {
  it("stores completion signals for future adaptation", () => {
    getRoutineOutcomeStore().clear();
    const record = logRoutineOutcome("Homework", true, false, {
      category: "study",
      childId: "child-1",
      routineDate: "2026-05-17",
    });
    assert.equal(record.completed, true);
    assert.equal(record.skipped, false);
    assert.equal(getRoutineOutcomeStore().list({ childId: "child-1" }).length, 1);
  });
});
