import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { enforceSchoolBlock } from "./ai-routine-utils.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { runRoutineIntelligencePipeline } from "./routine-intelligence-pipeline.js";
import {
  conflictSeverity,
  dayMatches,
  filterFixedActivitiesForDate,
  injectFixedActivityBlocks,
  parseFixedActivityInput,
  parseFixedActivitiesForDate,
  removeSimilarDynamicBlocks,
  shiftMealsAroundFixedBlocks,
  validateFixedActivityInputs,
  weekdayLabelFromDate,
} from "./routine-fixed-activities.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("filterFixedActivitiesForDate", () => {
  it("filters by weekday from date", () => {
    const fixed = [
      { activity: "Math tuition", days: ["Mon", "Wed"], start: "17:00", end: "18:00" },
      { activity: "Swimming", days: ["Sat"], start: "10:00", end: "11:00" },
    ];
    // 2026-05-15 is Friday
    const fri = filterFixedActivitiesForDate(fixed, "2026-05-15");
    assert.equal(fri.length, 0);
    // 2026-05-13 is Wednesday
    const wed = filterFixedActivitiesForDate(fixed, "2026-05-13");
    assert.equal(wed.length, 1);
    assert.equal(wed[0]!.activity, "Math tuition");
  });

  it("matches day aliases", () => {
    assert.equal(dayMatches("monday", "Mon"), true);
    assert.equal(dayMatches("WED", "Wed"), true);
    assert.equal(weekdayLabelFromDate("2026-05-13"), "Wed");
  });
});

describe("injectFixedActivityBlocks", () => {
  it("creates locked items with correct duration", () => {
    const parsed = parseFixedActivityInput({
      activity: "Football practice",
      days: ["Tue"],
      start: "17:00",
      end: "18:30",
    });
    assert.ok(parsed);
    const items = injectFixedActivityBlocks([], [parsed]);
    assert.equal(items.length, 1);
    assert.equal(items[0]!.locked, true);
    assert.equal(items[0]!.activitySource, "fixed");
    assert.equal(parseTimeToMins(items[0]!.time), 17 * 60);
    assert.equal(items[0]!.duration, 90);
  });

  it("removes duplicate study when tuition is fixed", () => {
    const parsed = parseFixedActivityInput({
      activity: "Math tuition",
      days: ["Mon"],
      start: "17:00",
      end: "18:00",
    });
    assert.ok(parsed);
    const base = [
      {
        time: "16:40",
        activity: "Tuition & study time",
        duration: 50,
        category: "study",
        status: "pending" as const,
      },
    ];
    const stripped = removeSimilarDynamicBlocks(base, [parsed]);
    assert.equal(stripped.items.length, 0);
    const withFixed = injectFixedActivityBlocks(stripped.items, [parsed!]);
    assert.equal(withFixed.length, 1);
    assert.match(withFixed[0]!.activity, /tuition/i);
  });
});

describe("conflictSeverity", () => {
  it("classifies school as non-blocking and sleep as blocking", () => {
    assert.equal(conflictSeverity("school"), "non_blocking");
    assert.equal(conflictSeverity("sleep"), "blocking");
    assert.equal(conflictSeverity("invalid"), "blocking");
  });
});

describe("shiftMealsAroundFixedBlocks", () => {
  it("keeps dinner from ending after 21:00 when shifted", () => {
    const fixed = parseFixedActivityInput({
      activity: "Math tuition",
      days: ["Wed"],
      start: "18:00",
      end: "19:00",
    });
    assert.ok(fixed);
    const items = [
      {
        time: "18:30",
        activity: "Dinner",
        duration: 45,
        category: "meal",
        status: "pending" as const,
      },
    ];
    const out = shiftMealsAroundFixedBlocks(items, [fixed!], {
      wakeMins: 7 * 60,
      sleepMins: 22 * 60,
    });
    assert.ok(out.shifts.length >= 1);
    const dinnerEnd =
      parseTimeToMins(out.items[0]!.time) + (out.items[0]!.duration ?? 45);
    assert.ok(dinnerEnd <= 21 * 60);
  });

  it("moves overlapping lunch after fixed tuition", () => {
    const fixed = parseFixedActivityInput({
      activity: "Math tuition",
      days: ["Wed"],
      start: "17:00",
      end: "18:00",
    });
    assert.ok(fixed);
    const items = [
      {
        time: "17:15",
        activity: "Lunch",
        duration: 30,
        category: "meal",
        status: "pending" as const,
      },
    ];
    const out = shiftMealsAroundFixedBlocks(items, [fixed!], {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.equal(out.shifts.length, 1);
    assert.equal(out.unresolved.length, 0);
    const mealStart = parseTimeToMins(out.items[0]!.time);
    assert.ok(mealStart < 17 * 60 || mealStart >= 18 * 60 + 10);
  });
});

describe("validateFixedActivityInputs", () => {
  it("flags sleep overlap as blocking", () => {
    const fixed = parseFixedActivityInput({
      activity: "Late class",
      days: ["Mon"],
      start: "20:30",
      end: "21:30",
    });
    assert.ok(fixed);
    const debug = validateFixedActivityInputs([fixed!], {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.equal(debug.hasBlockingConflicts, true);
    assert.ok(debug.conflicts.some((c) => c.severity === "blocking"));
  });
});

describe("pipeline integration", () => {
  it("preserves fixed tuition on Wednesday school day", () => {
    const base = enforceSchoolBlock(
      [
        { time: "07:00", activity: "Wake up & freshen up", duration: 30, category: "morning_routine", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      true,
      "09:00",
      "15:00",
      "Year 3",
    );
    const ctx = buildRoutineContext({ country: "IN", hasSchool: true, mood: "normal", weatherOutdoor: "yes" });
    const result = runRoutineIntelligencePipeline({
      items: base.map((i) => ({ ...i })),
      scheduleOpts: {
        wakeUpTime: "07:00",
        sleepTime: "21:00",
        ageGroup: "early_school",
        hasSchool: true,
        schoolStartMins: 9 * 60,
        schoolEndMins: 15 * 60,
      },
      builtContext: ctx,
      childProfile: { ageGroup: "early_school", ageInMonths: 96 },
      ageInMonths: 96,
      fridgeItems: "milk, rice",
      isVeg: true,
      mealSeed: 42,
      routineDate: "2026-05-13",
      fixedActivities: [
        { activity: "Math tuition", days: ["Wed"], start: "17:00", end: "18:00" },
      ],
    });

    const tuition = result.items.find((i) => /math tuition/i.test(i.activity));
    assert.ok(tuition, "fixed tuition should appear");
    assert.equal(tuition!.locked, true);
    assert.equal(parseTimeToMins(tuition!.time), 17 * 60);
    assert.equal(result.fixedActivities.fixedActivitiesApplied, true);
    assert.ok(result.fixedActivities.activitiesForToday.includes("Math tuition"));
  });
});
