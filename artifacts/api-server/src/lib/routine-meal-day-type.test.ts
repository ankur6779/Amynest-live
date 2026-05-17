import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyCanonicalMealKind,
  dedupeMealsByPriority,
  finalizeMealStructure,
  isRefuelItem,
  resolveIsSchoolDay,
  validateMealDayStructure,
} from "./routine-meal-day-type.js";
import { parseTimeToMins } from "./routine-scheduler.js";

describe("resolveIsSchoolDay", () => {
  it("is false on Sunday when isWeekendDay is true", () => {
    const sunday = new Date("2026-05-17T12:00:00");
    assert.equal(
      resolveIsSchoolDay({ hasSchool: true, isWeekendDay: true, date: sunday }),
      false,
    );
  });

  it("is true on Wednesday when hasSchool", () => {
    const wed = new Date("2026-05-13T12:00:00");
    assert.equal(resolveIsSchoolDay({ hasSchool: true, date: wed }), true);
  });
});

describe("finalizeMealStructure", () => {
  it("removes refuel and ensures lunch on weekend", () => {
    const items = [
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      {
        time: "15:30",
        activity: "After-school refuel",
        duration: 35,
        category: "meal",
      },
      { time: "19:30", activity: "Dinner", duration: 35, category: "meal" },
    ];
    const { items: out } = finalizeMealStructure(items, {
      isSchoolDay: false,
      wakeMins: 7 * 60,
      sleepMins: 21 * 60,
    });
    assert.equal(out.some(isRefuelItem), false);
    assert.ok(out.some((i) => classifyCanonicalMealKind(i) === "lunch"));
    assert.ok(out.some((i) => classifyCanonicalMealKind(i) === "snack"));
    const kinds = out
      .map((i) => classifyCanonicalMealKind(i))
      .filter(Boolean);
    assert.equal(kinds.filter((k) => k === "breakfast").length, 1);
    assert.equal(kinds.filter((k) => k === "dinner").length, 1);
    const lunch = out.find((i) => classifyCanonicalMealKind(i) === "lunch")!;
    const lunchMins = parseTimeToMins(lunch.time);
    assert.ok(lunchMins >= 12 * 60 && lunchMins <= 14 * 60 + 30);
  });

  it("dedupes duplicate snacks keeping one", () => {
    const items = [
      { time: "08:00", activity: "Breakfast", duration: 30, category: "meal" },
      { time: "12:30", activity: "Lunch", duration: 35, category: "meal" },
      { time: "16:45", activity: "Snack", duration: 20, category: "meal" },
      { time: "17:15", activity: "After-school snack", duration: 20, category: "meal" },
      { time: "20:00", activity: "Dinner", duration: 35, category: "meal" },
    ];
    const { items: out, removed } = dedupeMealsByPriority(items, false);
    assert.equal(out.filter((i) => classifyCanonicalMealKind(i) === "snack").length, 1);
    assert.ok(removed.length >= 1);
  });
});

describe("validateMealDayStructure", () => {
  it("flags refuel on non-school day", () => {
    const warnings = validateMealDayStructure(
      [
        {
          time: "15:00",
          activity: "After-school refuel",
          duration: 35,
          category: "meal",
        },
      ],
      false,
    );
    assert.ok(warnings.some((w) => /refuel/i.test(w)));
  });
});
