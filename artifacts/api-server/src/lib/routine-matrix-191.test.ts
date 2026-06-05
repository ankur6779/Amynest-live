import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveRoutineGenerationInputs } from "./routine-input-validation.js";
import { generateRuleBasedRoutine } from "./routine-templates.js";
import { buildRoutineContext } from "./routine-context-builder.js";
import { deriveBehavioralState } from "./routine-context-engine.js";
import { runRoutineIntelligencePipeline } from "./routine-intelligence-pipeline.js";
import { validateActivityOrdering } from "./routine-decision-engine.js";
import {
  hardValidateSchedule,
  parseTimeToMins,
} from "./routine-scheduler.js";
import { runBlockingTrustValidation } from "./routine-trust-validators.js";
import { isOutdoorBlockedByHeat } from "./routine-country-structure.js";
import { isOutdoorActivity } from "./routine-activity-metadata.js";

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Exact inputs for stress-QA matrix-191 (UAE / Preschool / weekend). */
function runMatrix191Pipeline() {
  const buildId = 190;
  const country = "AE";
  const age = {
    label: "Preschool (3-5)",
    group: "preschool" as const,
    months: 48,
    wake: "07:00",
    sleep: "20:30",
    hasSchool: true,
  };
  const day = { id: "weekend", hasSchool: false, isWeekend: true, specialPlans: "" };
  const caregiver = ["dad", "both", "mom", "mom", "grandparent", "both"][buildId % 6]!;
  const mood = ["happy", "normal", "lazy", "upset", "emotional", "sick", "hyperactive", "tired"][
    buildId % 8
  ]!;
  const weather = [
    { id: "extreme_heat", temp: 42, outdoor: "no", condition: "heat" },
    { id: "indoor_focus", temp: 38, outdoor: "limited", condition: "heat" },
    { id: "dusty", temp: 35, outdoor: "limited", condition: "dust" },
  ][hashSeed(`${country}-${age.group}-${day.id}`) % 3]!;
  const sleepPrev = [
    { sleepQuality: "good", moodScore: "normal" },
    { sleepQuality: "fair", moodScore: "tired" },
    { sleepQuality: "poor", moodScore: "low" },
    { sleepQuality: "poor", moodScore: "tired" },
    { sleepQuality: "good", moodScore: "lazy" },
    { sleepQuality: "good", moodScore: "hyperactive" },
    { sleepQuality: "poor", moodScore: "upset" },
  ][buildId % 7]!;

  const { resolved } = resolveRoutineGenerationInputs(
    {
      mood,
      fridgeItems: "milk, eggs, bread, rice, vegetables, chicken",
      weatherOutdoor: weather.outdoor,
      hasSchool: day.hasSchool,
    },
    {
      wakeUpTime: age.wake,
      sleepTime: age.sleep,
      schoolStartTime: "09:00",
      schoolEndTime: "15:00",
      hasSchool: day.hasSchool,
      mood,
      fridgeItems: "milk, eggs, bread, rice, vegetables, chicken",
      weatherOutdoor: weather.outdoor,
    },
  );

  const builtContext = buildRoutineContext({
    country,
    hasSchool: resolved.hasSchool,
    mood: resolved.mood,
    weatherOutdoor: resolved.weatherOutdoor,
    temperatureC: weather.temp,
    isWeekendDay: day.isWeekend,
    previousDayContext: sleepPrev,
    specialPlans: "",
  });

  const state = deriveBehavioralState(builtContext, {
    ageGroup: age.group,
    ageInMonths: age.months,
  });

  const rule = generateRuleBasedRoutine({
    childName: "QA Child",
    ageGroup: age.group,
    totalAgeMonths: age.months,
    wakeUpTime: resolved.wakeUpTime,
    sleepTime: resolved.sleepTime,
    schoolStartTime: resolved.schoolStartTime,
    schoolEndTime: resolved.schoolEndTime,
    travelMode: "car",
    hasSchool: resolved.hasSchool,
    mood: resolved.mood,
    foodType: "non_veg",
    specialPlans: resolved.specialPlans,
    fridgeItems: resolved.fridgeItems,
    caregiver,
    weatherOutdoor: resolved.weatherOutdoor,
    date: "2026-05-28",
    behaviorContext: "Outdoor child — loves park time",
  });

  const pipeline = runRoutineIntelligencePipeline({
    items: rule.items.map((i) => ({ ...i, status: i.status ?? "pending" })),
    scheduleOpts: {
      wakeUpTime: resolved.wakeUpTime,
      sleepTime: resolved.sleepTime,
      ageGroup: age.group,
      hasSchool: resolved.hasSchool,
      schoolStartMins: parseTimeToMins(resolved.schoolStartTime),
      schoolEndMins: parseTimeToMins(resolved.schoolEndTime),
    },
    builtContext,
    childProfile: { ageGroup: age.group, ageInMonths: age.months },
    behaviorHistory: { entries: [], previousDayContext: sleepPrev },
    fridgeItems: resolved.fridgeItems,
    isVeg: false,
    mealSeed: hashSeed("matrix-191"),
    ageInMonths: age.months,
  });

  return {
    items: pipeline.items,
    state,
    resolved,
    pipeline,
    wakeMins: parseTimeToMins(resolved.wakeUpTime),
    sleepMins: parseTimeToMins(resolved.sleepTime),
  };
}

describe("matrix-191 UAE preschool weekend RC", () => {
  it("passes hard validation with first activity at wake", () => {
    const { items, resolved } = runMatrix191Pipeline();
    const hard = hardValidateSchedule(items, resolved.wakeUpTime, resolved.sleepTime);
    assert.equal(hard.valid, true, hard.errors.join("; "));
    assert.ok(!hard.errors.some((e) => e.includes("first activity not at wake")));
  });

  it("has no UAE outdoor blocks before 18:30", () => {
    const { items } = runMatrix191Pipeline();
    for (const it of items.filter(isOutdoorActivity)) {
      const start = parseTimeToMins(it.time);
      assert.equal(
        isOutdoorBlockedByHeat(start, "AE"),
        false,
        `${it.activity} at ${it.time} violates UAE heat window`,
      );
    }
  });

  it("passes trust validation and dinner integrity", () => {
    const { items, resolved, wakeMins, sleepMins } = runMatrix191Pipeline();
    const trust = runBlockingTrustValidation(items, {
      wakeMins,
      sleepMins,
      ageGroup: "preschool",
      ageInMonths: 48,
      country: "AE",
      hasSchool: false,
    });
    assert.equal(trust.valid, true, trust.errors.join("; "));
    const dinners = items.filter(
      (i) =>
        (i.category ?? "").toLowerCase() === "meal" && /\bdinner\b/i.test(i.activity),
    );
    assert.equal(dinners.length, 1);
    assert.ok(parseTimeToMins(dinners[0]!.time) >= 20 * 60);
  });

  it("passes activity ordering checks for UAE heat", () => {
    const { items, state } = runMatrix191Pipeline();
    const ordering = validateActivityOrdering(items, state);
    assert.ok(
      !ordering.some((w) => /UAE outdoor.*before 18:30/i.test(w)),
      ordering.join("; "),
    );
  });
});
