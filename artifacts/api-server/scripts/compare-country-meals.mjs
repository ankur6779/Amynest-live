/**
 * Meal timing + suggestions per country (same fixed input).
 */
import { enforceSchoolBlock } from "../src/lib/ai-routine-utils.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import {
  getCountryRoutineProfile,
  windowMidpoint,
} from "../src/lib/routine-country-profile.ts";
import { mealWindowsForState } from "../src/lib/routine-context-engine.ts";
import { mealFromItems, parseFridgeItems } from "../src/lib/routine-templates.ts";
import {
  normalizeTo24h,
  parseTimeToMins,
  minsToTime24,
} from "../src/lib/routine-scheduler.ts";

const FRIDGE = "milk, eggs, bread, rice, vegetables";
const FRIDGE_LIST = parseFridgeItems(FRIDGE);
const SEED = 20260517;

const COUNTRIES = [
  { label: "USA", code: "US", flag: "🇺🇸" },
  { label: "UK", code: "UK", flag: "🇬🇧" },
  { label: "Australia", code: "AU", flag: "🇦🇺" },
  { label: "New Zealand", code: "NZ", flag: "🇳🇿" },
  { label: "Austria", code: "AT", flag: "🇦🇹" },
  { label: "UAE", code: "AE", flag: "🇦🇪" },
  { label: "India", code: "IN", flag: "🇮🇳" },
];

function minsToHHMM(m) {
  return minsToTime24(m);
}

function regionForMeals(mealPattern) {
  if (mealPattern === "indian") return "pan_indian";
  if (mealPattern === "middle_eastern") return "global";
  return "global";
}

const REGIONAL_SAMPLES = {
  global: {
    VEG_BREAKFAST: "Pancakes with maple syrup and fruit | Oatmeal + nuts + honey | Avocado toast + fruit",
    VEG_LUNCH: "Pasta with tomato sauce + salad | Veg burger + fries | Grilled chicken-style veg wrap + rice",
    VEG_DINNER: "Pasta + salad + bread | Veg soup + grilled cheese | Light pizza + salad",
    VEG_TIFFIN: "Veg sandwich + fruit | Pasta salad + juice | Cheese sandwich + fruit",
    VEG_SNACKS: "Fruit + yogurt | Banana + peanut butter | Cheese + crackers",
  },
  pan_indian: {
    VEG_BREAKFAST: "Idli with sambar | Poha with peanuts | Paratha with curd",
    VEG_LUNCH: "Dal rice with sabzi | Rajma chawal | Veg pulao with raita",
    VEG_DINNER: "Roti with dal and sabzi | Khichdi with ghee | Light dal rice",
    VEG_TIFFIN: "Paneer paratha + curd | Veg sandwich | Poha in box",
    VEG_SNACKS: "Fruit bowl + milk | Sprouts chaat | Vegetable sandwich",
  },
};

function pickMealOptions(region, key) {
  const bank = REGIONAL_SAMPLES[region] ?? REGIONAL_SAMPLES.global;
  const regionalPick = bank[key] ?? bank.VEG_LUNCH;
  const fridgePick = mealFromItems(key, FRIDGE_LIST, SEED);
  return {
    regionalOptions: regionalPick.split("|").map((s) => s.trim()),
    fridgeBasedSuggestion: fridgePick,
  };
}

function buildCanonicalBase() {
  return enforceSchoolBlock(
    [
      { time: "07:00", activity: "Wake up & freshen up", duration: 30, category: "morning_routine", status: "pending" },
      { time: "07:45", activity: "Breakfast", duration: 30, category: "meal", status: "pending" },
      { time: "09:00", activity: "At school", duration: 360, category: "school", status: "pending" },
      { time: "15:15", activity: "Homework", duration: 45, category: "study", status: "pending" },
      { time: "16:15", activity: "Outdoor play", duration: 45, category: "outdoor", status: "pending" },
      { time: "18:30", activity: "Dinner", duration: 35, category: "meal", status: "pending" },
      { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", status: "pending" },
    ],
    true,
    "09:00",
    "15:00",
    "Year 3",
  );
}

const base = buildCanonicalBase();
const out = [];

for (const { label, code, flag } of COUNTRIES) {
  const profile = getCountryRoutineProfile(code);
  const built = buildRoutineContext({
    country: code,
    weatherOutdoor: "yes",
    hasSchool: true,
    mood: "normal",
    temperatureC: 25,
    region: "default",
  });
  const pipeline = runRoutineIntelligencePipeline({
    items: base.map((i) => ({ ...i })),
    scheduleOpts: {
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      ageGroup: "early_school",
      hasSchool: true,
      schoolStartMins: 9 * 60,
      schoolEndMins: 15 * 60,
    },
    builtContext: built,
    childProfile: { ageGroup: "early_school" },
    behaviorHistory: { entries: [], previousDayContext: { moodScore: "normal", activityCompletion: 70 } },
  });

  const mealRegion = regionForMeals(profile.mealPattern);
  const windows = mealWindowsForState(pipeline.state);

  const mealSlots = pipeline.items
    .filter((it) => {
      const cat = (it.category ?? "").toLowerCase();
      return cat === "meal" || cat === "tiffin" || /\b(breakfast|lunch|dinner|drunch|nutrition|tiffin|meal)\b/i.test(it.activity);
    })
    .map((it) => {
      const start = normalizeTo24h(it.time);
      const end = minsToTime24(parseTimeToMins(start) + (it.duration ?? 30));
      return { slot: it.activity, start, end, notes: it.notes ?? "" };
    })
    .sort((a, b) => parseTimeToMins(a.start) - parseTimeToMins(b.start));

  const suggestions = {
    wakeUpNutrition: {
      window: `${minsToHHMM(6 * 60)}–${minsToHHMM(10 * 60)}`,
      fridgeBased: mealFromItems("VEG_SNACKS", FRIDGE_LIST, SEED + 1),
      regional: (REGIONAL_SAMPLES[mealRegion] ?? REGIONAL_SAMPLES.global).VEG_SNACKS,
    },
    breakfast: {
      allowedWindow: `${minsToHHMM(windows.breakfast.start)}–${minsToHHMM(windows.breakfast.end)}`,
      ...pickMealOptions(mealRegion, "VEG_BREAKFAST"),
    },
    schoolTiffin: pickMealOptions(mealRegion, "VEG_TIFFIN"),
    lunch: {
      allowedWindow: `${minsToHHMM(windows.lunch.start)}–${minsToHHMM(windows.lunch.end)}`,
      ...pickMealOptions(mealRegion, "VEG_LUNCH"),
    },
    afternoonSnack: pickMealOptions(mealRegion, "VEG_SNACKS"),
    dinner: {
      allowedWindow: `${minsToHHMM(windows.dinner.start)}–${minsToHHMM(windows.dinner.end)}`,
      profileTypical: `${minsToHHMM(profile.dinnerWindow[0])}–${minsToHHMM(profile.dinnerWindow[1])}`,
      ...pickMealOptions(mealRegion, "VEG_DINNER"),
    },
  };

  out.push({
    country: label,
    code,
    flag,
    mealPattern: profile.mealPattern,
    mealRegion,
    dinnerWindowProfile: `${minsToHHMM(profile.dinnerWindow[0])}–${minsToHHMM(profile.dinnerWindow[1])}`,
    scheduledMeals: mealSlots,
    suggestions,
    dinnerScheduled: mealSlots.find((m) => /dinner/i.test(m.slot))?.start,
  });
}

console.log(JSON.stringify(out, null, 2));
