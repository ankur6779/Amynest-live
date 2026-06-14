import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  repairDinnerAnchor,
  getMinimumDinnerSleepGap,
} from "./routine-meal-dinner-integrity.js";
import { finalizeMealStructure } from "./routine-meal-day-type.js";
import { validateRequiredDinner } from "./routine-trust-validators.js";
import { parseTimeToMins } from "./routine-scheduler.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import { resolveRoutineGenerationInputs } from "./routine-input-validation.js";
import { generateRuleBasedRoutine } from "./routine-templates.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { runRoutineIntelligencePipeline } from "./routine-intelligence-pipeline.js";
import {
  getCountryRoutineProfile,
  windowMidpoint,
  type LaunchCountry,
} from "./routine-country-profile.js";

function dinnerBlocks(items: RoutineScheduleItem[]) {
  return items.filter(
    (i) =>
      (i.category ?? "").toLowerCase() === "meal" && /\bdinner\b/i.test(i.activity),
  );
}

function sleepBlock(items: RoutineScheduleItem[]) {
  return items.find(
    (i) =>
      (i.category ?? "").toLowerCase() === "sleep" ||
      /\b(bedtime|lights out|sleep)\b/i.test(i.activity),
  );
}

function dinnerEndToSleepGapMins(items: RoutineScheduleItem[], sleepMins: number): number {
  const dinner = dinnerBlocks(items)[0];
  if (!dinner) return -1;
  const dinnerEnd = parseTimeToMins(dinner.time) + (dinner.duration ?? 35);
  const bed = sleepBlock(items);
  const bedMins = bed ? parseTimeToMins(bed.time) : sleepMins;
  return bedMins - dinnerEnd;
}

function trustDinner(items: RoutineScheduleItem[], country: string, sleepMins: number) {
  return validateRequiredDinner(items, {
    wakeMins: 7 * 60,
    sleepMins,
    ageInMonths: 60,
    country,
  });
}

function runCountryWeekdayPipeline(code: LaunchCountry, ageMonths: number) {
  const profile = getCountryRoutineProfile(code);
  const ageGroup =
    ageMonths < 48
      ? ("preschool" as const)
      : ageMonths < 156
        ? ("early_school" as const)
        : ("teen" as const);
  const wakeUpTime = `${String(Math.floor(windowMidpoint(profile.wakeWindow) / 60)).padStart(2, "0")}:${String(windowMidpoint(profile.wakeWindow) % 60).padStart(2, "0")}`;
  const sleepTime = `${String(Math.floor(windowMidpoint(profile.sleepWindow) / 60)).padStart(2, "0")}:${String(windowMidpoint(profile.sleepWindow) % 60).padStart(2, "0")}`;
  const schoolEndTime = `${String(Math.floor(windowMidpoint(profile.schoolEndTimeRange) / 60)).padStart(2, "0")}:${String(windowMidpoint(profile.schoolEndTimeRange) % 60).padStart(2, "0")}`;

  const { resolved } = resolveRoutineGenerationInputs({
    wakeUpTime,
    sleepTime,
    schoolStartTime: "09:00",
    schoolEndTime,
    hasSchool: true,
    weatherOutdoor: "yes",
    mood: "normal",
  });

  const builtContext = buildRoutineContext({
    country: code,
    hasSchool: true,
    mood: "normal",
    weatherOutdoor: "yes",
    isWeekendDay: false,
  });

  const rule = generateRuleBasedRoutine({
    childName: "Cert Child",
    ageGroup,
    totalAgeMonths: ageMonths,
    wakeUpTime: resolved.wakeUpTime,
    sleepTime: resolved.sleepTime,
    schoolStartTime: resolved.schoolStartTime,
    schoolEndTime: resolved.schoolEndTime,
    travelMode: "car",
    hasSchool: true,
    mood: "normal",
    foodType: "non_veg",
    caregiver: "mom",
    weatherOutdoor: "yes",
    date: "2026-06-10",
  });

  const pipeline = runRoutineIntelligencePipeline({
    items: rule.items.map((i) => ({ ...i, status: i.status ?? "pending" })),
    scheduleOpts: {
      wakeUpTime: resolved.wakeUpTime,
      sleepTime: resolved.sleepTime,
      ageGroup,
      hasSchool: true,
      schoolStartMins: parseTimeToMins(resolved.schoolStartTime),
      schoolEndMins: parseTimeToMins(resolved.schoolEndTime),
      ageInMonths: ageMonths,
    },
    builtContext,
    childProfile: { ageGroup, ageInMonths: ageMonths },
    mealSeed: 42,
    ageInMonths: ageMonths,
    routineDate: "2026-06-10",
  });

  return {
    items: pipeline.items,
    sleepMins: parseTimeToMins(resolved.sleepTime),
    gap: dinnerEndToSleepGapMins(pipeline.items, parseTimeToMins(resolved.sleepTime)),
    dinner: dinnerBlocks(pipeline.items)[0],
    bedtime: sleepBlock(pipeline.items),
  };
}

describe("getMinimumDinnerSleepGap", () => {
  it("returns 60 min for toddlers", () => {
    assert.equal(getMinimumDinnerSleepGap(36), 60);
    assert.equal(getMinimumDinnerSleepGap(47), 60);
  });

  it("returns 90 min for school-age children", () => {
    assert.equal(getMinimumDinnerSleepGap(48), 90);
    assert.equal(getMinimumDinnerSleepGap(96), 90);
    assert.equal(getMinimumDinnerSleepGap(155), 90);
  });

  it("returns 120 min for teens", () => {
    assert.equal(getMinimumDinnerSleepGap(156), 120);
    assert.equal(getMinimumDinnerSleepGap(192), 120);
  });

  it("defaults to 90 min when age unknown", () => {
    assert.equal(getMinimumDinnerSleepGap(undefined), 90);
  });
});

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
      ageInMonths: 47,
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
      ageInMonths: 47,
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
    const sleepMins = 21 * 60 + 15;
    const { items: out } = repairDinnerAnchor(items, {
      country: "UK",
      sleepMins,
      ageInMonths: 72,
    });
    const dinner = dinnerBlocks(out)[0]!;
    const gap = dinnerEndToSleepGapMins(out, sleepMins);
    assert.ok(gap >= getMinimumDinnerSleepGap(72), `gap ${gap}min below age minimum`);
    assert.equal(trustDinner(out, "UK", sleepMins).valid, true);
  });
});

describe("dinner-to-sleep gap certification (repairDinnerAnchor)", () => {
  it("UK school-age: gap >= 90 min when dinner was compressed against bedtime", () => {
    const sleepMins = 20 * 60 + 15;
    const items = [
      { time: "19:05", activity: "Dinner", duration: 30, category: "meal" },
      { time: "20:15", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "UK",
      sleepMins,
      ageInMonths: 96,
    });
    const gap = dinnerEndToSleepGapMins(out, sleepMins);
    assert.ok(gap >= 60, `UK minimum 60 min, got ${gap}`);
    assert.ok(gap >= 90, `UK preferred 90 min for school-age, got ${gap}`);
  });

  it("India school-age: gap >= 90 min", () => {
    const sleepMins = 21 * 60 + 30;
    const items = [
      { time: "20:05", activity: "Dinner", duration: 30, category: "meal" },
      { time: "21:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "IN",
      sleepMins,
      ageInMonths: 96,
    });
    const gap = dinnerEndToSleepGapMins(out, sleepMins);
    assert.ok(gap >= 90, `IN school-age gap ${gap}min below 90`);
  });

  it("UAE school-age: gap >= 90 min", () => {
    const sleepMins = 21 * 60 + 45;
    const items = [
      { time: "20:05", activity: "Dinner", duration: 35, category: "meal" },
      { time: "21:45", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "AE",
      sleepMins,
      ageInMonths: 96,
    });
    const gap = dinnerEndToSleepGapMins(out, sleepMins);
    assert.ok(gap >= 90, `AE school-age gap ${gap}min below 90`);
  });

  it("teen profile: gap >= 120 min", () => {
    const sleepMins = 22 * 60;
    const items = [
      { time: "20:30", activity: "Dinner", duration: 35, category: "meal" },
      { time: "22:00", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "US",
      sleepMins,
      ageInMonths: 180,
    });
    const gap = dinnerEndToSleepGapMins(out, sleepMins);
    assert.ok(gap >= 120, `teen gap ${gap}min below 120`);
  });

  it("toddler profile: gap >= 60 min", () => {
    const sleepMins = 20 * 60 + 30;
    const items = [
      { time: "19:45", activity: "Dinner", duration: 30, category: "meal" },
      { time: "20:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "UK",
      sleepMins,
      ageInMonths: 42,
    });
    const gap = dinnerEndToSleepGapMins(out, sleepMins);
    assert.ok(gap >= 60, `toddler gap ${gap}min below 60`);
  });

  it("dinner end never overlaps bedtime and stays before wind-down slot", () => {
    const sleepMins = 21 * 60 + 30;
    const items = [
      { time: "20:50", activity: "Wind-down", duration: 20, category: "rest" },
      { time: "20:55", activity: "Dinner", duration: 40, category: "meal" },
      { time: "21:30", activity: "Bedtime", duration: 0, category: "sleep" },
    ];
    const { items: out } = repairDinnerAnchor(items, {
      country: "IN",
      sleepMins,
      ageInMonths: 96,
    });
    const dinner = dinnerBlocks(out)[0]!;
    const dinnerEnd = parseTimeToMins(dinner.time) + (dinner.duration ?? 35);
    const windDown = out.find((i) => /wind.?down/i.test(i.activity));
    const bed = sleepBlock(out)!;
    assert.ok(dinnerEnd <= parseTimeToMins(bed.time));
    if (windDown) {
      assert.ok(
        dinnerEnd <= parseTimeToMins(windDown.time),
        "dinner must finish before wind-down begins",
      );
    }
  });
});

describe("dinner-to-sleep gap certification (full pipeline)", () => {
  it("UK school-age weekday pipeline gap >= 90 min", () => {
    const { gap } = runCountryWeekdayPipeline("UK", 96);
    assert.ok(gap >= 60, `UK pipeline gap ${gap} below 60`);
    assert.ok(gap >= 90, `UK pipeline gap ${gap} below 90`);
  });

  it("India school-age weekday pipeline gap >= 90 min", () => {
    const { gap } = runCountryWeekdayPipeline("IN", 96);
    assert.ok(gap >= 90, `IN pipeline gap ${gap} below 90`);
  });

  it("UAE school-age weekday pipeline gap >= 90 min", () => {
    const { gap } = runCountryWeekdayPipeline("AE", 96);
    assert.ok(gap >= 90, `AE pipeline gap ${gap} below 90`);
  });

  it("US school-age weekday pipeline gap >= 90 min", () => {
    const { gap } = runCountryWeekdayPipeline("US", 96);
    assert.ok(gap >= 90, `US pipeline gap ${gap} below 90`);
  });

  it("NZ and AU school-age weekday pipeline remain valid (gap >= 90 min)", () => {
    for (const code of ["NZ", "AU"] as const) {
      const { gap } = runCountryWeekdayPipeline(code, 96);
      assert.ok(gap >= 90, `${code} pipeline gap ${gap} below 90`);
    }
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
      ageInMonths: 47,
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
