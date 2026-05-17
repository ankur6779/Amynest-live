import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  assertFinalTimelineIntegrity,
  deduplicateMeals,
  enforceEarlySleepCompression,
  enforceFinalTimelineIntegrity,
  enforceSleepBoundary,
  fillWeekendIdleGaps,
  fixTimeBasedLabels,
  resolveOverlapsByPriority,
  splitLongMealBlocks,
} from "./routine-final-integrity.js";
import { parseTimeToMins } from "./routine-scheduler.js";

const SLEEP = 21 * 60 + 30;
const WAKE = 7 * 60 + 30;

describe("fixTimeBasedLabels", () => {
  it("renames Morning prefix after noon", () => {
    const { items } = fixTimeBasedLabels([
      {
        time: "19:05",
        activity: "Morning play & exploration",
        duration: 30,
        category: "play",
        status: "pending",
      },
    ]);
    assert.match(items[0]!.activity, /^Evening/i);
  });
});

describe("deduplicateMeals", () => {
  it("removes duplicate dinner blocks", () => {
    const { items, adjustments } = deduplicateMeals([
      { time: "18:20", activity: "Dinner", duration: 90, category: "meal", status: "pending" },
      { time: "20:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
    ]);
    assert.equal(items.filter((i) => /\bdinner\b/i.test(i.activity)).length, 1);
    assert.ok(adjustments.length > 0);
  });
});

describe("resolveOverlapsByPriority", () => {
  it("shifts lower-priority block after dinner", () => {
    const { items } = resolveOverlapsByPriority(
      [
        { time: "20:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        {
          time: "20:00",
          activity: "Outdoor play or walk",
          duration: 10,
          category: "outdoor",
          status: "pending",
        },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      SLEEP,
    );
    const dinner = items.find((i) => /dinner/i.test(i.activity))!;
    const outdoor = items.find((i) => /outdoor/i.test(i.activity))!;
    assert.ok(parseTimeToMins(outdoor.time) >= parseTimeToMins(dinner.time) + (dinner.duration ?? 35));
  });
});

describe("enforceSleepBoundary", () => {
  it("trims wind-down that extends past lights-out", () => {
    const { items } = enforceSleepBoundary(
      [
        { time: "21:15", activity: "Wind-down & story", duration: 25, category: "rest", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      SLEEP,
    );
    const wd = items.find((i) => /wind-down/i.test(i.activity))!;
    const sleep = items.find((i) => /lights out/i.test(i.activity))!;
    assert.ok(
      parseTimeToMins(wd.time) + (wd.duration ?? 0) <= parseTimeToMins(sleep.time) + 2,
    );
  });
});

describe("fillWeekendIdleGaps", () => {
  it("inserts filler when gap exceeds 120 minutes on weekend", () => {
    const { items, adjustments } = fillWeekendIdleGaps(
      [
        { time: "10:00", activity: "Creative play time", duration: 40, category: "play", status: "pending" },
        { time: "14:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: 7 * 60 + 30, sleepMins: 21 * 60 + 30, hasSchool: false, isWeekendDay: true },
    );
    assert.ok(adjustments.length > 0);
    assert.ok(items.length > 3);
  });
});

describe("splitLongMealBlocks", () => {
  it("splits dinner longer than 60 minutes", () => {
    const { items, adjustments } = splitLongMealBlocks([
      {
        time: "18:00",
        activity: "Dinner",
        duration: 90,
        category: "meal",
        status: "pending",
      },
    ]);
    assert.ok(adjustments.length > 0);
    assert.ok(items.some((i) => /\bdinner\b/i.test(i.activity)));
    assert.ok(items.some((i) => /family time/i.test(i.activity)));
  });
});

describe("enforceEarlySleepCompression", () => {
  it("anchors wind-down at sleep-40min and ends dinner 10min before", () => {
    const sleepMins = 21 * 60;
    const { items } = enforceEarlySleepCompression(
      [
        { time: "20:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "20:50", activity: "Wind-down & story", duration: 25, category: "wind-down", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      sleepMins,
      7 * 60 + 30,
    );
    const wd = items.find((i) => /wind-down/i.test(i.activity))!;
    const dinner = items.find((i) => /\bdinner\b/i.test(i.activity))!;
    assert.equal(parseTimeToMins(wd.time), sleepMins - 40);
    assert.ok(
      parseTimeToMins(dinner.time) + (dinner.duration ?? 0) <=
        parseTimeToMins(wd.time) - 10,
    );
  });
});

describe("enforceFinalTimelineIntegrity", () => {
  it("repairs overlapping evening blocks and sleep order", () => {
    const { items, assertionsPassed } = enforceFinalTimelineIntegrity(
      [
        { time: "07:30", activity: "Wake up", duration: 30, category: "morning_routine", status: "pending" },
        { time: "20:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        {
          time: "20:00",
          activity: "Outdoor play or walk",
          duration: 10,
          category: "outdoor",
          status: "pending",
        },
        { time: "21:15", activity: "Wind-down & story", duration: 25, category: "rest", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
        {
          time: "20:50",
          activity: "Morning play & exploration",
          duration: 10,
          category: "play",
          status: "pending",
        },
      ],
      { wakeMins: WAKE, sleepMins: SLEEP },
    );
    assert.equal(assertionsPassed, true);
    const assertResult = assertFinalTimelineIntegrity(items, { wakeMins: WAKE, sleepMins: SLEEP });
    assert.equal(assertResult.passed, true);
    assert.ok(/lights out/i.test(items.at(-1)!.activity));
    assert.ok(!items.some((i) => /^morning /i.test(i.activity) && parseTimeToMins(i.time) >= 12 * 60));
  });

  it("preserves locked special event at requested time", () => {
    const { items, assertionsPassed } = enforceFinalTimelineIntegrity(
      [
        { time: "09:00", activity: "At school", duration: 360, category: "school", status: "pending" },
        {
          time: "17:00",
          activity: "Birthday party",
          duration: 90,
          category: "family",
          status: "pending",
          locked: true,
          culturalTag: "special_event",
          activitySource: "special",
        },
        { time: "20:00", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      { wakeMins: WAKE, sleepMins: SLEEP },
    );
    assert.equal(assertionsPassed, true);
    const party = items.find((i) => /birthday/i.test(i.activity))!;
    assert.equal(parseTimeToMins(party.time), 17 * 60);
  });
});
