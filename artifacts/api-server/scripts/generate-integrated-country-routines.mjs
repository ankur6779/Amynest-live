/**
 * Full integrated routine + meal output per country (fixed input).
 * Run: node --import tsx/esm scripts/generate-integrated-country-routines.mjs
 */
import { enforceSchoolBlock } from "../src/lib/ai-routine-utils.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import { getCountryRoutineProfile } from "../src/lib/routine-country-profile.ts";
import { differenceScore } from "../src/lib/routine-country-structure.ts";
import { validateMealActivityIntegration } from "../src/lib/routine-meal-integration.ts";
import {
  normalizeTo24h,
  parseTimeToMins,
  minsToTime24,
  hardValidateSchedule,
} from "../src/lib/routine-scheduler.ts";

const FIXED_INPUT = {
  age: 8,
  wakeTime: "07:00",
  sleepTime: "21:00",
  hasSchool: true,
  schoolStart: "09:00",
  schoolEnd: "15:00",
  mood: "normal",
  caregiver: "parent",
  weather: { condition: "clear", temperature: 25 },
  fridgeItems: ["milk", "eggs", "bread", "rice", "vegetables"],
  goals: ["balanced development"],
};

const COUNTRIES = [
  { label: "USA", code: "US", flag: "🇺🇸" },
  { label: "UK", code: "UK", flag: "🇬🇧" },
  { label: "Australia", code: "AU", flag: "🇦🇺" },
  { label: "New Zealand", code: "NZ", flag: "🇳🇿" },
  { label: "Austria", code: "AT", flag: "🇦🇹" },
  { label: "UAE", code: "AE", flag: "🇦🇪" },
  { label: "India", code: "IN", flag: "🇮🇳" },
];

/** Slim school-day skeleton — meal flow + culture fill the afternoon. */
function buildCanonicalBase() {
  return enforceSchoolBlock(
    [
      { time: "07:00", activity: "Wake up & freshen up", duration: 30, category: "morning_routine", status: "pending" },
      { time: "09:00", activity: "At school", duration: 360, category: "school", status: "pending" },
      { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
    ],
    true,
    "09:00",
    "15:00",
    "Year 3",
  );
}

function toTimeline(items) {
  return items
    .filter((it) => (it.duration ?? 0) >= 10 || /sleep|lights out/i.test(it.activity))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time))
    .map((it) => {
      const start = normalizeTo24h(it.time);
      const end = minsToTime24(parseTimeToMins(start) + (it.duration ?? 30));
      const block = { activity: it.activity, start, end };
      if (it.dishes?.length) {
        block.dishes = it.dishes;
        if (it.culturalReason) block.culturalReason = it.culturalReason;
        if (it.energyImpact) block.energyImpact = it.energyImpact;
      }
      return block;
    });
}

const baseItems = buildCanonicalBase();
const mealSeed = 20260517;
const fridgeStr = FIXED_INPUT.fridgeItems.join(", ");
const byCountry = {};

for (const { label, code, flag } of COUNTRIES) {
  const builtContext = buildRoutineContext({
    country: code,
    weatherOutdoor: "yes",
    hasSchool: true,
    mood: "normal",
    temperatureC: FIXED_INPUT.weather.temperature,
  });

  const pipeline = runRoutineIntelligencePipeline({
    items: baseItems.map((i) => ({ ...i })),
    scheduleOpts: {
      wakeUpTime: FIXED_INPUT.wakeTime,
      sleepTime: FIXED_INPUT.sleepTime,
      ageGroup: "early_school",
      hasSchool: true,
      schoolStartMins: 9 * 60,
      schoolEndMins: 15 * 60,
    },
    builtContext,
    childProfile: { ageGroup: "early_school", ageInMonths: FIXED_INPUT.age * 12 },
    ageInMonths: FIXED_INPUT.age * 12,
    fridgeItems: fridgeStr,
    isVeg: true,
    mealSeed: mealSeed + code.charCodeAt(0),
  });

  const flowOpts = {
    hasSchool: true,
    schoolEndMins: 15 * 60,
    sleepMins: 21 * 60,
  };

  const timeline = toTimeline(pipeline.items);
  const hard = hardValidateSchedule(pipeline.items, FIXED_INPUT.wakeTime, FIXED_INPUT.sleepTime);
  const mealWarnings = validateMealActivityIntegration(pipeline.items, code, flowOpts);
  const profile = getCountryRoutineProfile(code);

  byCountry[label] = {
    flag,
    code,
    timeline,
    valid: hard.valid,
    errors: hard.errors,
    mealWarnings,
    dinnerWindow: profile.dinnerWindow,
    reverted: pipeline.reverted,
  };
}

console.log(JSON.stringify({ input: FIXED_INPUT, countries: byCountry }, null, 2));
