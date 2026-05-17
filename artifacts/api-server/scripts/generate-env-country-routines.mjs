/**
 * Full integrated routines: weather + AQI per country (validation run).
 * Run: node --import tsx/esm scripts/generate-env-country-routines.mjs
 */
import { enforceSchoolBlock } from "../src/lib/ai-routine-utils.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { deriveBehavioralState } from "../src/lib/routine-context-engine.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import { validateMealActivityIntegration } from "../src/lib/routine-meal-integration.ts";
import { validateAqiOutdoorRules, isOutdoorActivityItem } from "../src/lib/routine-aqi.ts";
import { validateActivityOrdering } from "../src/lib/routine-decision-engine.ts";
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

const HOT_AFTERNOON_END = 17 * 60 + 30;
const UAE_EVENING_START = 18 * 60 + 30;

/** Weather + AQI per launch market (validation matrix). */
const COUNTRY_ENV = [
  {
    label: "USA",
    code: "US",
    flag: "🇺🇸",
    envLabel: "Rainy, AQI 40 (good)",
    context: {
      weatherOutdoor: "no",
      outdoorSuitability: "no",
      temperatureC: 18,
      environment: { temperature: 18, condition: "rainy", AQI: 40 },
      aqi: 40,
    },
  },
  {
    label: "UK",
    code: "UK",
    flag: "🇬🇧",
    envLabel: "Cold (5°C), AQI 70 (moderate)",
    context: {
      weatherOutdoor: "limited",
      outdoorSuitability: "limited",
      temperatureC: 5,
      environment: { temperature: 5, condition: "cold", AQI: 70 },
      aqi: 70,
    },
  },
  {
    label: "Australia",
    code: "AU",
    flag: "🇦🇺",
    envLabel: "Hot (35°C), AQI 60",
    context: {
      weatherOutdoor: "yes",
      outdoorSuitability: "limited",
      temperatureC: 35,
      hydrationNeedLevel: "high",
      environment: { temperature: 35, condition: "heatwave", AQI: 60 },
      aqi: 60,
    },
  },
  {
    label: "New Zealand",
    code: "NZ",
    flag: "🇳🇿",
    envLabel: "Windy, AQI 45",
    context: {
      weatherOutdoor: "limited",
      outdoorSuitability: "limited",
      temperatureC: 16,
      environment: { temperature: 16, condition: "windy", AQI: 45 },
      aqi: 45,
    },
  },
  {
    label: "Austria",
    code: "AT",
    flag: "🇦🇹",
    envLabel: "Snow, AQI 30",
    context: {
      weatherOutdoor: "no",
      outdoorSuitability: "no",
      temperatureC: -2,
      environment: { temperature: -2, condition: "cold", AQI: 30 },
      aqi: 30,
    },
  },
  {
    label: "UAE",
    code: "AE",
    flag: "🇦🇪",
    envLabel: "Extreme heat (42°C), AQI 180 (unhealthy_sensitive)",
    context: {
      weatherOutdoor: "yes",
      outdoorSuitability: "limited",
      temperatureC: 42,
      hydrationNeedLevel: "extreme",
      environment: { temperature: 42, condition: "heatwave", AQI: 180 },
      aqi: 180,
    },
  },
  {
    label: "India",
    code: "IN",
    flag: "🇮🇳",
    envLabel: "Pleasant (25°C), AQI 280 (very unhealthy)",
    context: {
      weatherOutdoor: "yes",
      outdoorSuitability: "yes",
      temperatureC: 25,
      environment: { temperature: 25, condition: "sunny", AQI: 280 },
      aqi: 280,
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
      if (it.dishes?.length) block.dishes = it.dishes;
      if (it.notes) block.notes = it.notes;
      const reason =
        it.scheduleDecision?.reason ??
        (it.culturalReason ? `Meal: ${it.culturalReason}` : undefined);
      if (reason) block.reason = reason;
      if (it.advisory) block.advisory = it.advisory;
      return block;
    });
}

function isOutdoorTimelineBlock(t) {
  if (/indoor|air-safe|board games|breathing-safe|hydration break/i.test(t.activity)) {
    return false;
  }
  return /outdoor|park|cricket|beach|walk|playground|backyard|soccer|football|sports practice|evening outdoor/i.test(
    t.activity,
  );
}

function validateRun(timeline, aqi, code) {
  const issues = [];
  const wake = timeline[0];
  const sleep = timeline[timeline.length - 1];
  if (!wake?.activity.match(/wake/i)) issues.push("wake not first");
  if (!sleep?.activity.match(/sleep|lights out/i)) issues.push("sleep not last");

  const refuel = timeline.find((t) => /refuel/i.test(t.activity));
  if (!refuel) issues.push("missing after-school refuel");

  const dinner = timeline.find((t) => /\bdinner\b/i.test(t.activity));
  if (!dinner) issues.push("missing dinner");

  const isIndiaMetro = code === "IN" && aqi > 200;
  if (aqi > 200 && !isIndiaMetro) {
    for (const t of timeline) {
      if (isOutdoorTimelineBlock(t)) {
        issues.push(`AQI violation: outdoor "${t.activity}" at ${t.start} (AQI=${aqi})`);
      }
    }
  }
  if (isIndiaMetro) {
    const outdoor = timeline.filter(isOutdoorTimelineBlock);
    if (outdoor.length === 0) {
      issues.push(`India AQI ${aqi}: expected limited outdoor with advisory`);
    }
    for (const t of outdoor) {
      if (!t.advisory?.level || !t.advisory?.message) {
        issues.push(`India AQI ${aqi}: missing advisory on "${t.activity}"`);
      }
    }
  }

  if (code === "AE") {
    for (const t of timeline) {
      if (isOutdoorTimelineBlock(t)) {
        const s = parseTimeToMins(t.start);
        if (s < UAE_EVENING_START) {
          issues.push(`UAE violation: outdoor "${t.activity}" before 18:30`);
        }
      }
    }
  }

  if (dinner) {
    const dinnerStart = parseTimeToMins(dinner.start);
    const highAfter = timeline.filter((t) => {
      const s = parseTimeToMins(t.start);
      return (
        s > dinnerStart + 5 &&
        s < parseTimeToMins(sleep.start) - 5 &&
        /soccer|obstacle|sports practice|dance party|football club/i.test(t.activity)
      );
    });
    if (highAfter.length) {
      issues.push(`high-energy after dinner: ${highAfter.map((t) => t.activity).join(", ")}`);
    }
  }

  return issues;
}

const baseItems = buildCanonicalBase();
const fridgeStr = FIXED_CHILD.fridgeItems.join(", ");
const results = {};

for (const country of COUNTRY_ENV) {
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
    mealSeed: 20260517 + country.code.charCodeAt(0) * 7,
  });

  const timeline = toTimeline(pipeline.items);
  const hard = hardValidateSchedule(
    pipeline.items,
    FIXED_CHILD.wakeTime,
    FIXED_CHILD.sleepTime,
  );

  const outdoor = timeline.filter(isOutdoorTimelineBlock);
  const indoorEnv = timeline.filter((t) =>
    /indoor|air-safe|cozy|creative|breathing-safe|board games/i.test(t.activity),
  );

  results[country.label] = {
    flag: country.flag,
    code: country.code,
    environment: country.envLabel,
    aqi: country.context.aqi,
    state: {
      allowOutdoor: state.allowOutdoor,
      dayPlanningMode: state.dayPlanningMode,
      aqiCategory: state.aqiCategory,
      outdoorBlockedByAqi: state.outdoorBlockedByAqi,
      maxOutdoorDurationFromAqi: state.maxOutdoorDurationFromAqi,
      environmentSeverity: state.environmentSeverity,
      aqiExposureMode: state.aqiExposureMode,
    },
    confidence: pipeline.confidence,
    timeline,
    valid: hard.valid && validateRun(timeline, country.context.aqi, country.code).length === 0,
    reverted: pipeline.reverted,
    hardErrors: hard.errors,
    validationIssues: validateRun(timeline, country.context.aqi, country.code),
    aqiWarnings: validateAqiOutdoorRules(
      pipeline.items,
      country.context.aqi,
      country.code,
    ),
    outdoorBlocks: outdoor,
    indoorEnvBlocks: indoorEnv,
    decisionTraceSample: pipeline.decisionTrace?.slice(0, 6) ?? [],
  };
}

console.log(JSON.stringify({ child: FIXED_CHILD, countries: results }, null, 2));
