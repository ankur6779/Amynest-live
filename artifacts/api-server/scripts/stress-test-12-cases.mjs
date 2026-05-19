/**
 * 12-case stress test: 4 countries (IN, US, UK, AU) × 3 ages (6, 10, 14).
 * Mirrors the same internal pipeline used by POST /api/routines/generate
 * (the rule-based path), bypassing auth/DB so it can run offline.
 *
 * Run from artifacts/api-server:
 *   node --import tsx/esm scripts/stress-test-12-cases.mjs
 */
import { enforceSchoolBlock } from "../src/lib/ai-routine-utils.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import {
  getCountryRoutineProfile,
  getCountryLabelPack,
} from "../src/lib/routine-country-profile.ts";
import {
  normalizeTo24h,
  parseTimeToMins,
  minsToTime24,
  hardValidateSchedule,
} from "../src/lib/routine-scheduler.ts";
import { validateMealActivityIntegration } from "../src/lib/routine-meal-integration.ts";

// ── Input definitions (mirror the user's 12 cases) ──────────────────────────
const CASES = [
  // INDIA
  { id: 1, childId: 101, country: "IN", region: "indian", age: 6,
    wakeTime: "7:00 AM", sleepTime: "9:00 PM",
    schoolStart: "8:00 AM", schoolEnd: "2:30 PM",
    schoolMealMode: "home_lunch", diet: "vegetarian",
    fridge: "milk, banana, roti, curd, rice",
    weather: "limited", temp: 38, caregiver: "mom" },
  { id: 2, childId: 102, country: "IN", region: "indian", age: 10,
    wakeTime: "6:45 AM", sleepTime: "9:30 PM",
    schoolStart: "8:00 AM", schoolEnd: "3:00 PM",
    schoolMealMode: "packed_lunch", diet: "mixed",
    fridge: "eggs, bread, vegetables, milk",
    weather: "limited", temp: 36, caregiver: "both" },
  { id: 3, childId: 103, country: "IN", region: "indian", age: 14,
    wakeTime: "6:30 AM", sleepTime: "10:30 PM",
    schoolStart: "8:30 AM", schoolEnd: "4:00 PM",
    schoolMealMode: "school_cafeteria", diet: "mixed",
    fridge: "milk, paneer, fruits, leftovers",
    weather: "limited", temp: 35, caregiver: "self" },
  // USA
  { id: 4, childId: 201, country: "US", region: "western", age: 6,
    wakeTime: "7:30 AM", sleepTime: "8:30 PM",
    schoolStart: "8:30 AM", schoolEnd: "3:00 PM",
    schoolMealMode: "school_lunch", diet: "mixed",
    fridge: "milk, cereal, peanut butter, bread, fruits",
    weather: "yes", temp: 24, caregiver: "mom" },
  { id: 5, childId: 202, country: "US", region: "western", age: 10,
    wakeTime: "7:00 AM", sleepTime: "9:00 PM",
    schoolStart: "8:00 AM", schoolEnd: "3:30 PM",
    schoolMealMode: "school_lunch", diet: "mixed",
    fridge: "eggs, toast, yogurt, chicken, salad",
    weather: "yes", temp: 22, caregiver: "both" },
  { id: 6, childId: 203, country: "US", region: "western", age: 14,
    wakeTime: "6:45 AM", sleepTime: "10:30 PM",
    schoolStart: "8:00 AM", schoolEnd: "4:00 PM",
    schoolMealMode: "cafeteria", diet: "mixed",
    fridge: "protein bars, milk, leftovers",
    weather: "yes", temp: 20, caregiver: "self" },
  // UK
  { id: 7, childId: 301, country: "UK", region: "western", age: 6,
    wakeTime: "7:30 AM", sleepTime: "8:30 PM",
    schoolStart: "9:00 AM", schoolEnd: "3:15 PM",
    schoolMealMode: "packed_lunch", diet: "mixed",
    fridge: "milk, bread, butter, fruits",
    weather: "yes", temp: 18, caregiver: "mom" },
  { id: 8, childId: 302, country: "UK", region: "western", age: 10,
    wakeTime: "7:00 AM", sleepTime: "9:00 PM",
    schoolStart: "8:45 AM", schoolEnd: "3:30 PM",
    schoolMealMode: "packed_lunch", diet: "mixed",
    fridge: "eggs, toast, beans, vegetables",
    weather: "yes", temp: 17, caregiver: "both" },
  { id: 9, childId: 303, country: "UK", region: "western", age: 14,
    wakeTime: "6:45 AM", sleepTime: "10:30 PM",
    schoolStart: "8:30 AM", schoolEnd: "4:00 PM",
    schoolMealMode: "school_meal", diet: "mixed",
    fridge: "sandwich items, milk, snacks",
    weather: "yes", temp: 16, caregiver: "self" },
  // AUSTRALIA
  { id: 10, childId: 401, country: "AU", region: "western", age: 6,
    wakeTime: "7:00 AM", sleepTime: "8:30 PM",
    schoolStart: "8:45 AM", schoolEnd: "3:00 PM",
    schoolMealMode: "packed_lunch", diet: "mixed",
    fridge: "milk, fruits, bread, yogurt",
    weather: "yes", temp: 25, caregiver: "mom" },
  { id: 11, childId: 402, country: "AU", region: "western", age: 10,
    wakeTime: "6:45 AM", sleepTime: "9:00 PM",
    schoolStart: "8:30 AM", schoolEnd: "3:30 PM",
    schoolMealMode: "packed_lunch", diet: "mixed",
    fridge: "eggs, toast, fruits, chicken",
    weather: "yes", temp: 26, caregiver: "both" },
  { id: 12, childId: 403, country: "AU", region: "western", age: 14,
    wakeTime: "6:30 AM", sleepTime: "10:30 PM",
    schoolStart: "8:30 AM", schoolEnd: "4:00 PM",
    schoolMealMode: "school_canteen", diet: "mixed",
    fridge: "protein snacks, milk, leftovers",
    weather: "yes", temp: 24, caregiver: "self" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function to24h(t) {
  return normalizeTo24h(t);
}

function ageGroupFor(age) {
  const months = age * 12;
  if (months < 12) return "infant";
  if (months < 36) return "toddler";
  if (months < 60) return "preschool";
  if (months < 120) return "early_school";
  return "pre_teen";
}

/** Build a canonical pre-localization base routine that the pipeline will reshape. */
function buildBase(wakeUp, sleep, schoolStart, schoolEnd) {
  const wake = parseTimeToMins(to24h(wakeUp));
  const sStart = parseTimeToMins(to24h(schoolStart));
  const sEnd = parseTimeToMins(to24h(schoolEnd));
  const sleepMins = parseTimeToMins(to24h(sleep));
  const schoolDuration = sEnd - sStart;

  const items = [
    { time: minsToTime24(wake),            activity: "Wake up & freshen up",   duration: 30, category: "morning_routine", status: "pending" },
    { time: minsToTime24(wake + 30),       activity: "Breakfast",              duration: 30, category: "meal",            status: "pending" },
    { time: minsToTime24(sStart),          activity: "At school",              duration: schoolDuration, category: "school", status: "pending" },
    { time: minsToTime24(sEnd + 15),       activity: "After-school snack",     duration: 20, category: "meal",            status: "pending" },
    { time: minsToTime24(sEnd + 45),       activity: "Homework & study",       duration: 45, category: "study",           status: "pending" },
    { time: minsToTime24(sEnd + 105),      activity: "Outdoor play",           duration: 45, category: "outdoor",         status: "pending" },
    { time: minsToTime24(sEnd + 165),      activity: "Creative play",          duration: 30, category: "play",            status: "pending" },
    { time: minsToTime24(sleepMins - 150), activity: "Dinner",                 duration: 35, category: "meal",            status: "pending" },
    { time: minsToTime24(sleepMins - 45),  activity: "Wind-down & story",      duration: 30, category: "rest",            status: "pending" },
    { time: minsToTime24(sleepMins),       activity: "Lights out",             duration: 30, category: "sleep",           status: "pending" },
  ];
  return enforceSchoolBlock(items, true, to24h(schoolStart), to24h(schoolEnd), "school");
}

function runCase(c) {
  const ageGroup = ageGroupFor(c.age);
  const baseItems = buildBase(c.wakeTime, c.sleepTime, c.schoolStart, c.schoolEnd);

  const builtContext = buildRoutineContext({
    country: c.country,
    weatherOutdoor: c.weather,
    hasSchool: true,
    mood: "normal",
    temperatureC: c.temp,
    region: c.region,
  });

  const pipeline = runRoutineIntelligencePipeline({
    items: baseItems.map((i) => ({ ...i })),
    scheduleOpts: {
      wakeUpTime: to24h(c.wakeTime),
      sleepTime: to24h(c.sleepTime),
      ageGroup,
      hasSchool: true,
      schoolStartMins: parseTimeToMins(to24h(c.schoolStart)),
      schoolEndMins: parseTimeToMins(to24h(c.schoolEnd)),
    },
    builtContext,
    childProfile: { ageGroup, ageInMonths: c.age * 12 },
    ageInMonths: c.age * 12,
    fridgeItems: c.fridge,
    isVeg: c.diet === "vegetarian",
    mealSeed: 20260520 + c.childId,
    behaviorHistory: {
      entries: [],
      previousDayContext: { moodScore: "normal", activityCompletion: 70 },
    },
    routineDate: "2026-05-20",
    childId: String(c.childId),
    // Decision-enforced layer signals
    schoolMealMode: c.schoolMealMode,
    diet: c.diet,
    caregiver: c.caregiver,
  });

  const hard = hardValidateSchedule(pipeline.items, to24h(c.wakeTime), to24h(c.sleepTime));
  const mealWarnings = validateMealActivityIntegration(pipeline.items, c.country, {
    hasSchool: true,
    schoolEndMins: parseTimeToMins(to24h(c.schoolEnd)),
    sleepMins: parseTimeToMins(to24h(c.sleepTime)),
  });
  const profile = getCountryRoutineProfile(c.country);
  const labels = getCountryLabelPack(c.country);

  const formatted = pipeline.items
    .filter((it) => (it.duration ?? 0) >= 5 || /sleep|lights out|bed/i.test(it.activity))
    .sort((a, b) => parseTimeToMins(a.time) - parseTimeToMins(b.time))
    .map((it) => {
      const start = normalizeTo24h(it.time);
      const end = minsToTime24(parseTimeToMins(start) + (it.duration ?? 30));
      return {
        start,
        end,
        duration: it.duration,
        activity: it.activity,
        category: it.category,
        dishes: it.dishes,
        culturalReason: it.culturalReason ?? it.culturalTag ?? undefined,
        energyImpact: it.energyImpact,
      };
    });

  const findFirst = (re) => formatted.find((i) => re.test(i.activity));
  const findAll = (re) => formatted.filter((i) => re.test(i.activity));

  const breakfast = findFirst(/breakfast/i);
  const lunch = findFirst(/\blunch\b|tiffin/i);
  const dinner = findFirst(/dinner|tea time/i);
  const sleep = findFirst(/lights out|bedtime|sleep$/i);
  const studyBlocks = findAll(/homework|study|tuition|reading|revision|hausaufgaben/i);
  const outdoorBlocks = findAll(/outdoor|park|playground|backyard|beach|nature|bbq/i);
  const extracurricular = findAll(/soccer|football|cricket|sports|music|club|hobby class|tuition/i);

  const studyMinutes = studyBlocks.reduce((s, b) => s + (b.duration ?? 0), 0);
  const outdoorMinutes = outdoorBlocks.reduce((s, b) => s + (b.duration ?? 0), 0);

  return {
    case: c.id,
    country: c.country,
    age: c.age,
    ageGroup,
    inputs: {
      wake: c.wakeTime, sleep: c.sleepTime,
      school: `${c.schoolStart}-${c.schoolEnd}`,
      weather: c.weather, temp: c.temp,
      caregiver: c.caregiver, diet: c.diet,
      schoolMealMode: c.schoolMealMode,
      fridge: c.fridge,
    },
    profile: {
      country: profile.country,
      mealPattern: profile.mealPattern,
      dinnerWindow: profile.dinnerWindow,
      sleepWindow: profile.sleepWindow,
      schoolEndTimeRange: profile.schoolEndTimeRange,
      extracurricularCulture: profile.extracurricularCulture,
      outdoorPreference: profile.outdoorPreference,
      academicIntensity: profile.academicIntensity,
      independenceLevel: profile.independenceLevel,
    },
    labels,
    valid: hard.valid,
    errors: hard.errors,
    mealWarnings,
    reverted: pipeline.reverted,
    confidence: pipeline.confidence,
    state: { dayType: pipeline.state.dayType, activityBias: pipeline.state.activityBias },
    summary: {
      breakfast: breakfast && { start: breakfast.start, activity: breakfast.activity, dishes: breakfast.dishes },
      lunch:     lunch     && { start: lunch.start,     activity: lunch.activity,     dishes: lunch.dishes },
      dinner:    dinner    && { start: dinner.start,    activity: dinner.activity,    dishes: dinner.dishes },
      sleep:     sleep     && { start: sleep.start,     activity: sleep.activity },
      studyMinutes,
      outdoorMinutes,
      extracurricular: extracurricular.map((e) => e.activity),
    },
    routine: formatted.map(({ start, end, activity, category, dishes }) => ({
      start, end, activity, category,
      dishes: dishes && dishes.length ? dishes : undefined,
    })),
  };
}

// ── Execute all 12 cases ────────────────────────────────────────────────────
const results = CASES.map(runCase);

// ── Print compact + full output ─────────────────────────────────────────────
console.log("=".repeat(80));
console.log("STRESS TEST: 12 CASES · 4 countries × 3 ages · 2026-05-20");
console.log("=".repeat(80));

for (const r of results) {
  console.log(
    `\n[${r.case}] ${r.country} · age ${r.age} (${r.ageGroup}) · valid=${r.valid} reverted=${r.reverted} conf=${r.confidence}`,
  );
  console.log(
    `   Wake ${r.inputs.wake} | Sleep ${r.inputs.sleep} | School ${r.inputs.school} | weather=${r.inputs.weather} ${r.inputs.temp}°C | care=${r.inputs.caregiver}`,
  );
  const s = r.summary;
  const dishStr = (d) => Array.isArray(d) && d.length ? ` [${d.join(" | ")}]` : "";
  console.log(`   Breakfast: ${s.breakfast?.start ?? "—"} ${s.breakfast?.activity ?? ""}${dishStr(s.breakfast?.dishes)}`);
  console.log(`   Lunch:     ${s.lunch?.start ?? "—"} ${s.lunch?.activity ?? ""}${dishStr(s.lunch?.dishes)}`);
  console.log(`   Dinner:    ${s.dinner?.start ?? "—"} ${s.dinner?.activity ?? ""}${dishStr(s.dinner?.dishes)}`);
  console.log(`   Sleep:     ${s.sleep?.start ?? "—"} ${s.sleep?.activity ?? ""}`);
  console.log(`   Study mins=${s.studyMinutes}   Outdoor mins=${s.outdoorMinutes}   Extracurricular=${JSON.stringify(s.extracurricular)}`);
  if (r.errors.length) console.log(`   ERRORS: ${JSON.stringify(r.errors)}`);
  if (r.mealWarnings.length) console.log(`   MEAL WARNINGS: ${JSON.stringify(r.mealWarnings)}`);
}

console.log("\n" + "=".repeat(80));
console.log("FULL JSON OUTPUT");
console.log("=".repeat(80));
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
