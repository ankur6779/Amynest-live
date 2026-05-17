import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyRoutineRealismPolish,
  fillIdleGaps,
  enforceWindDownSleepConsistency,
  humanizeRoboticPhrasing,
  applyWeekendRealism,
  MAX_IDLE_GAP_MINS,
} from "./routine-realism-polish.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("fillIdleGaps", () => {
  it("fills gaps longer than 120 minutes", () => {
    const items = [
      { time: "09:00", activity: "Breakfast", duration: 30, category: "meal", status: "pending" as const },
      { time: "14:00", activity: "Lunch", duration: 35, category: "meal", status: "pending" as const },
      { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" as const },
    ];
    const { items: out, adjustments } = fillIdleGaps(items, {
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
      isSchoolDay: false,
      isWeekendDay: true,
    });
    assert.ok(adjustments.length > 0);
    assert.ok(out.length > items.length);
    assert.ok(!out.some((i) => /^free time$/i.test(i.activity)));
  });
});

describe("humanizeRoboticPhrasing", () => {
  it("rewrites caregiver handler text", () => {
    const { items } = humanizeRoboticPhrasing([
      {
        time: "10:00",
        activity: "Today is being handled by Mom — include bonding",
        duration: 30,
        category: "family",
        status: "pending" as const,
      },
    ]);
    assert.match(items[0]!.activity, /Mom time/i);
    assert.ok(!/today is being handled/i.test(items[0]!.activity));
  });
});

describe("applyWeekendRealism", () => {
  it("keeps at most one academic block on weekend", () => {
    const { items } = applyWeekendRealism(
      [
        { time: "10:00", activity: "Tuition & study", duration: 45, category: "study", status: "pending" },
        { time: "11:00", activity: "Homework", duration: 40, category: "study", status: "pending" },
      ],
      { isSchoolDay: false, isWeekendDay: true },
    );
    const academic = items.filter((i) => /study|learning|homework/i.test(i.activity));
    assert.equal(academic.length, 1);
    assert.match(academic[0]!.activity, /light learning/i);
  });
});

describe("enforceWindDownSleepConsistency", () => {
  it("pulls sleep earlier when wind-down gap exceeds 45 minutes", () => {
    const { items } = enforceWindDownSleepConsistency(
      [
        { time: "19:30", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
        { time: "20:15", activity: "Wind-down", duration: 25, category: "rest", status: "pending" },
        { time: "22:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      22 * 60 + 30,
    );
    const sleep = items.find((i) => /lights out/i.test(i.activity))!;
    const wind = items.find((i) => /wind-down/i.test(i.activity))!;
    const gap =
      parseTimeToMins(sleep.time) -
      (parseTimeToMins(wind.time) + (wind.duration ?? 0));
    assert.ok(gap <= 45);
  });
});

describe("applyRoutineRealismPolish", () => {
  it("validates no gap over max after polish", () => {
    const { items, warnings } = applyRoutineRealismPolish(
      [
        { time: "08:00", activity: "Wake up", duration: 20, category: "morning_routine", status: "pending" },
        { time: "12:30", activity: "Lunch", duration: 30, category: "meal", status: "pending" },
        { time: "20:00", activity: "Wind-down & story", duration: 25, category: "rest", status: "pending" },
        { time: "21:30", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
      ],
      {
        wakeMins: 7 * 60,
        sleepMins: 21 * 60 + 30,
        isSchoolDay: false,
        isWeekendDay: true,
        seed: 42,
      },
    );
    const sorted = [...items].sort(
      (a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const end =
        parseTimeToMins(sorted[i]!.time) + (sorted[i]!.duration ?? 30);
      const gap = parseTimeToMins(sorted[i + 1]!.time) - end;
      if (!/lights out|sleep/i.test(sorted[i]!.activity)) {
        assert.ok(
          gap <= MAX_IDLE_GAP_MINS + 30,
          `gap ${gap} after ${sorted[i]!.activity}`,
        );
      }
    }
    assert.ok(items.length >= 4);
  });
});
