import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { repairDinnerAnchor } from "./routine-meal-dinner-integrity.js";
import { finalizeMealStructure } from "./routine-meal-day-type.js";
import { validateRequiredDinner } from "./routine-trust-validators.js";
import { parseTimeToMins } from "./routine-scheduler.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

function dinnerBlocks(items: RoutineScheduleItem[]) {
  return items.filter(
    (i) =>
      (i.category ?? "").toLowerCase() === "meal" && /\bdinner\b/i.test(i.activity),
  );
}

function trustDinner(items: RoutineScheduleItem[], country: string, sleepMins: number) {
  return validateRequiredDinner(items, {
    wakeMins: 7 * 60,
    sleepMins,
    ageInMonths: 60,
    country,
  });
}

describe("repairDinnerAnchor", () => {
  it("inserts missing dinner for UK holiday child", () => {
    const items = [
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "12:30", activity: "Lunch", duration: 35, category: "meal" },
      { time: "17:00", activity: "Snack", duration: 20, category: "meal" },
      { time: "20:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "UK",
      sleepMins: 20 * 60 + 30,
      ageInMonths: 84,
    });
    assert.equal(dinnerBlocks(out).length, 1);
    assert.equal(trustDinner(out, "UK", 20 * 60 + 30).valid, true);
  });

  it("clamps UAE preschool dinner from 17:00 into AE window", () => {
    const items = [
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      {
        time: "15:30",
        activity: "After-school refuel",
        duration: 35,
        category: "meal",
      },
      {
        time: "17:00",
        activity: "Dinner",
        duration: 35,
        category: "meal",
        meal: "Snack",
        structureKind: "snack",
      } as RoutineScheduleItem,
      { time: "21:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out, adjustments } = repairDinnerAnchor(items, {
      country: "AE",
      sleepMins: 21 * 60 + 30,
      ageInMonths: 48,
    });
    assert.ok(adjustments.some((a) => a.includes("clamped")));
    const dinner = dinnerBlocks(out)[0]!;
    const mins = parseTimeToMins(dinner.time);
    assert.ok(mins >= 20 * 60, `dinner at ${dinner.time} before AE window`);
    assert.equal((dinner as { structureKind?: string }).structureKind, undefined);
    assert.equal(trustDinner(out, "AE", 21 * 60 + 30).valid, true);
  });

  it("clamps UAE dinner at 19:25 into AE window", () => {
    const items = [
      { time: "19:25", activity: "Dinner", duration: 35, category: "meal" },
      { time: "21:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "AE",
      sleepMins: 21 * 60 + 30,
      ageInMonths: 48,
    });
    const dinner = dinnerBlocks(out)[0]!;
    assert.ok(parseTimeToMins(dinner.time) >= 20 * 60);
    assert.equal(trustDinner(out, "AE", 21 * 60 + 30).valid, true);
  });

  it("dedupes duplicate dinners keeping one trust-valid block", () => {
    const items = [
      { time: "17:00", activity: "Dinner", duration: 30, category: "meal" },
      { time: "20:30", activity: "Dinner", duration: 35, category: "meal" },
      { time: "21:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "IN",
      sleepMins: 21 * 60 + 30,
      ageInMonths: 96,
    });
    assert.equal(dinnerBlocks(out).length, 1);
    assert.equal(trustDinner(out, "IN", 21 * 60 + 30).valid, true);
  });

  it("ensures dinner ends before bedtime on recovery compression day", () => {
    const items = [
      { time: "20:45", activity: "Dinner", duration: 50, category: "meal" },
      { time: "21:15", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "UK",
      sleepMins: 21 * 60 + 15,
      ageInMonths: 72,
    });
    const dinner = dinnerBlocks(out)[0]!;
    const end = parseTimeToMins(dinner.time) + (dinner.duration ?? 35);
    assert.ok(end < 21 * 60 + 15);
    assert.equal(trustDinner(out, "UK", 21 * 60 + 15).valid, true);
  });
});

describe("finalizeMealStructure dinner protection", () => {
  it("UAE school day keeps dinner in country window after meal merge", () => {
    const items = [
      { time: "07:00", activity: "Breakfast", duration: 30, category: "meal" },
      {
        time: "15:15",
        activity: "After-school refuel",
        duration: 35,
        category: "meal",
      },
      { time: "17:00", activity: "Snack", duration: 20, category: "meal" },
      { time: "17:30", activity: "Dinner", duration: 35, category: "meal" },
      { time: "21:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = finalizeMealStructure(items, {
      isSchoolDay: true,
      schoolEndMins: 15 * 60,
      wakeMins: 6 * 60 + 30,
      sleepMins: 21 * 60 + 30,
      country: "AE",
      ageInMonths: 48,
    });
    assert.equal(dinnerBlocks(out).length, 1);
    assert.ok(parseTimeToMins(dinnerBlocks(out)[0]!.time) >= 20 * 60);
    assert.equal(trustDinner(out, "AE", 21 * 60 + 30).valid, true);
  });

  it("UK holiday non-school day preserves dinner anchor", () => {
    const items = [
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "12:30", activity: "Lunch", duration: 35, category: "meal" },
      { time: "17:00", activity: "Snack", duration: 20, category: "meal" },
      { time: "20:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = finalizeMealStructure(items, {
      isSchoolDay: false,
      wakeMins: 7 * 60,
      sleepMins: 20 * 60 + 30,
      country: "UK",
      ageInMonths: 84,
    });
    assert.equal(dinnerBlocks(out).length, 1);
    assert.equal(trustDinner(out, "UK", 20 * 60 + 30).valid, true);
  });
});
