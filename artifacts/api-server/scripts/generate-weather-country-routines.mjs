/**
 * Integrated routines per country with country-specific weather.
 * Run: node --import tsx/esm scripts/generate-weather-country-routines.mjs
 */
import { enforceSchoolBlock } from "../src/lib/ai-routine-utils.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { deriveBehavioralState } from "../src/lib/routine-context-engine.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import { validateMealActivityIntegration } from "../src/lib/routine-meal-integration.ts";
import {
  normalizeTo24h,
  parseTimeToMins,
  minsToTime24,
  hardValidateSchedule,
} from "../src/lib/routine-scheduler.ts";

const FIXED_CHILD = {
  age: 8,
  wakeTime: "07:00",
  sleepTime: "21:00",
  hasSchool: true,
  schoolStart: "09:00",
  schoolEnd: "15:00",
  mood: "normal",
  caregiver: "parent",
  fridgeItems: ["milk", "eggs", "bread", "rice", "vegetables"],
  goals: ["balanced development"],
};

/** Maps user weather brief → pipeline context signals. */
const COUNTRY_WEATHER = [
  {
    label: "USA",
    code: "US",
    flag: "🇺🇸",
    weatherLabel: "Rainy (moderate rain)",
    context: {
      weatherOutdoor: "no",
      outdoorSuitability: "no",
      temperatureC: 18,
      hydrationNeedLevel: "low",
    },
  },
  {
    label: "UK",
    code: "UK",
    flag: "🇬🇧",
    weatherLabel: "Cold (5°C, cloudy)",
    context: {
      weatherOutdoor: "limited",
      outdoorSuitability: "limited",
      temperatureC: 5,
      sensoryStressLevel: "medium",
    },
  },
  {
    label: "Australia",
    code: "AU",
    flag: "🇦🇺",
    weatherLabel: "Hot (35°C)",
    context: {
      weatherOutdoor: "yes",
      outdoorSuitability: "limited",
      temperatureC: 35,
      hydrationNeedLevel: "high",
    },
  },
  {
    label: "New Zealand",
    code: "NZ",
    flag: "🇳🇿",
    weatherLabel: "Windy",
    context: {
      weatherOutdoor: "limited",
      outdoorSuitability: "limited",
      temperatureC: 16,
    },
  },
  {
    label: "Austria",
    code: "AT",
    flag: "🇦🇹",
    weatherLabel: "Snow / freezing",
    context: {
      weatherOutdoor: "no",
      outdoorSuitability: "no",
      temperatureC: -2,
      sensoryStressLevel: "medium",
    },
  },
  {
    label: "UAE",
    code: "AE",
    flag: "🇦🇪",
    weatherLabel: "Extreme heat (42°C)",
    context: {
      weatherOutdoor: "yes",
      outdoorSuitability: "limited",
      temperatureC: 42,
      hydrationNeedLevel: "extreme",
    },
  },
  {
    label: "India",
    code: "IN",
    flag: "🇮🇳",
    weatherLabel: "Pleasant (25°C, clear)",
    context: {
      weatherOutdoor: "yes",
      outdoorSuitability: "yes",
      temperatureC: 25,
    },
  },
];

function buildCanonicalBase() {
  return enforceSchoolBlock(
    [
      {
        time: "07:00",
        activity: "Wake up & freshen up",
        duration: 30,
        category: "morning_routine",
        status: "pending",
      },
      {
        time: "09:00",
        activity: "At school",
        duration: 360,
        category: "school",
        status: "pending",
      },
      {
        time: "21:00",
        activity: "Lights out",
        duration: 30,
        category: "sleep",
        status: "pending",
      },
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
      if (it.notes) block.notes = it.notes;
      if (it.scheduleDecision?.reason) {
        block.weatherReason = it.scheduleDecision.reason;
      }
      return block;
    });
}

function summarizeWeatherImpact(state, timeline) {
  const outdoor = timeline.filter((t) =>
    /outdoor|park|cricket|beach|walk|playground|backyard/i.test(t.activity),
  );
  const indoor = timeline.filter((t) =>
    /indoor|creative|puzzle|building|cozy|quiet time|rest/i.test(t.activity),
  );
  const split = timeline.filter((t) => /morning session|evening session/i.test(t.activity));
  return {
    allowOutdoor: state.allowOutdoor,
    dayType: state.dayType,
    splitOutdoorPlay: state.splitOutdoorPlay,
    preferIndoorCreative: state.preferIndoorCreative,
    environmentConstraint: state.environmentConstraintLevel,
    decisions: state.decisions?.map((d) => `${d.priority}: ${d.resolution}`) ?? [],
    outdoorBlocks: outdoor.map((t) => `${t.activity} (${t.start}–${t.end})`),
    indoorBlocks: indoor.map((t) => `${t.activity} (${t.start}–${t.end})`),
    splitSessions: split.map((t) => `${t.activity} (${t.start}–${t.end})`),
  };
}

const baseItems = buildCanonicalBase();
const mealSeed = 20260517;
const fridgeStr = FIXED_CHILD.fridgeItems.join(", ");
const results = {};

for (const country of COUNTRY_WEATHER) {
  const builtContext = buildRoutineContext({
    country: country.code,
    hasSchool: true,
    mood: FIXED_CHILD.mood,
    ...country.context,
  });

  const state = deriveBehavioralState(builtContext, {
    ageGroup: "early_school",
    ageInMonths: FIXED_CHILD.age * 12,
  });

  const pipeline = runRoutineIntelligencePipeline({
    items: baseItems.map((i) => ({ ...i })),
    scheduleOpts: {
      wakeUpTime: FIXED_CHILD.wakeTime,
      sleepTime: FIXED_CHILD.sleepTime,
      ageGroup: "early_school",
      hasSchool: true,
      schoolStartMins: 9 * 60,
      schoolEndMins: 15 * 60,
    },
    builtContext,
    childProfile: {
      ageGroup: "early_school",
      ageInMonths: FIXED_CHILD.age * 12,
    },
    ageInMonths: FIXED_CHILD.age * 12,
    fridgeItems: fridgeStr,
    isVeg: true,
    mealSeed: mealSeed + country.code.charCodeAt(0) * 3,
  });

  const timeline = toTimeline(pipeline.items);
  const hard = hardValidateSchedule(
    pipeline.items,
    FIXED_CHILD.wakeTime,
    FIXED_CHILD.sleepTime,
  );
  const mealWarnings = validateMealActivityIntegration(pipeline.items, country.code, {
    hasSchool: true,
    schoolEndMins: 15 * 60,
    sleepMins: 21 * 60,
  });

  results[country.label] = {
    flag: country.flag,
    code: country.code,
    weather: country.weatherLabel,
    weatherContext: country.context,
    timeline,
    valid: hard.valid,
    reverted: pipeline.reverted,
    mealWarnings,
    weatherImpact: summarizeWeatherImpact(state, timeline),
  };
}

console.log(JSON.stringify({ child: FIXED_CHILD, countries: results }, null, 2));
