/**
 * India fallback failure simulation — partial env data (null AQI, API fail, 38°C).
 * Run: node --import tsx/esm scripts/generate-fallback-failure-routine.mjs
 */
import {
  buildEnvironmentalContext,
  buildExplanations,
  estimateAQIByCountry,
  fallbackAtmosphericSnapshot,
  finalizeSnapshot,
  normalizeSnapshot,
} from "@workspace/environment";
import { mapAgeGroupToEnvAgeGroup } from "@workspace/environment";
import { enforceSchoolBlock } from "../src/lib/ai-routine-utils.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { deriveBehavioralState } from "../src/lib/routine-context-engine.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import { validateMealActivityIntegration } from "../src/lib/routine-meal-integration.ts";
import { validateAqiOutdoorRules } from "../src/lib/routine-aqi.ts";
import {
  normalizeTo24h,
  parseTimeToMins,
  minsToTime24,
  hardValidateSchedule,
} from "../src/lib/routine-scheduler.ts";

const INPUT = {
  age: 8,
  wakeTime: "07:00",
  sleepTime: "21:00",
  hasSchool: true,
  schoolStart: "09:00",
  schoolEnd: "15:00",
  mood: "normal",
  caregiver: "parent",
  country: "India",
  countryCode: "IN",
  location: { lat: 28.6139, lng: 77.209 },
  environmentOverride: {
    AQI: null,
    temperatureC: 38,
    condition: "clear",
    simulateApiFailure: true,
  },
  fridgeItems: ["milk", "eggs", "bread", "rice", "vegetables"],
  goals: ["balanced development"],
};

/** Simulates Open-Meteo failure + partial override (heat known, AQI missing). */
function resolveEnvironmentWithFallback() {
  const { environmentOverride, country, countryCode, location } = INPUT;
  let snapshot;
  let confidence;
  let aqiSource;

  if (environmentOverride.simulateApiFailure) {
    snapshot = fallbackAtmosphericSnapshot(countryCode);
    snapshot = normalizeSnapshot({
      ...snapshot,
      source: "fallback",
      temperatureC: environmentOverride.temperatureC,
      apparentC: environmentOverride.temperatureC,
    });
    aqiSource = "fallback";
    confidence = "low";
  } else {
    snapshot = normalizeSnapshot({
      observedAt: new Date().toISOString(),
      source: "open-meteo",
      temperatureC: environmentOverride.temperatureC,
      apparentC: environmentOverride.temperatureC,
    });
    const finalized = finalizeSnapshot(snapshot, countryCode);
    snapshot = finalized.snapshot;
    confidence = finalized.confidence;
    aqiSource = finalized.aqiRepaired ? "country_estimate" : "api";
  }

  const aqi =
    environmentOverride.AQI ??
    snapshot.aqiUs ??
    estimateAQIByCountry(countryCode);

  snapshot = { ...snapshot, aqiUs: aqi, temperatureC: environmentOverride.temperatureC };

  const envAge = mapAgeGroupToEnvAgeGroup("early_school");
  const ctx = buildEnvironmentalContext({
    snapshot,
    ageGroup: envAge,
    location: {
      latitude: location.lat,
      longitude: location.lng,
      label: "Delhi, IN (simulated)",
    },
    confidence,
    country: countryCode,
  });
  ctx.explanations = buildExplanations(ctx);

  return { envContext: ctx, aqi, confidence, aqiSource, snapshot };
}

function buildCanonicalBase() {
  return enforceSchoolBlock(
    [
      {
        time: INPUT.wakeTime,
        activity: "Wake up & freshen up",
        duration: 30,
        category: "morning_routine",
        status: "pending",
      },
      {
        time: INPUT.schoolStart,
        activity: "At school",
        duration: 360,
        category: "school",
        status: "pending",
      },
      {
        time: INPUT.sleepTime,
        activity: "Lights out",
        duration: 30,
        category: "sleep",
        status: "pending",
      },
    ],
    INPUT.hasSchool,
    INPUT.schoolStart,
    INPUT.schoolEnd,
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
      if (it.advisory) {
        if (it.advisory.warning || it.advisory.suggestion) {
          block.advisory = it.advisory;
        } else {
          block.advisory = {
            warning: it.advisory.message ?? "Air quality advisory",
            suggestion:
              it.advisory.actions?.join("; ") ??
              "Use mask and limit outdoor exposure",
          };
        }
      }
      return block;
    });
}

function isOutdoorBlock(t) {
  if (/indoor|air-safe|board games|breathing-safe|hydration break/i.test(t.activity)) {
    return false;
  }
  return /outdoor|park|cricket|walk|playground|evening outdoor|light outdoor/i.test(
    t.activity,
  );
}

function validate(timeline, aqi, state, debug) {
  const issues = [];
  const wake = timeline[0];
  const sleep = timeline[timeline.length - 1];
  if (!wake?.activity.match(/wake/i)) issues.push("wake not first");
  if (!sleep?.activity.match(/sleep|lights out/i)) issues.push("sleep not last");

  const refuel = timeline.find((t) => /refuel/i.test(t.activity));
  if (!refuel) issues.push("missing after-school refuel (~15:15)");

  const snack = timeline.find((t) => /snack/i.test(t.activity));
  if (!snack) issues.push("missing late-afternoon snack");

  const dinner = timeline.find((t) => /\bdinner\b/i.test(t.activity));
  if (!dinner) issues.push("missing dinner (~20:00)");

  const afternoonEnd = 17 * 60;
  for (const t of timeline.filter(isOutdoorBlock)) {
    const start = parseTimeToMins(t.start);
    if (start >= 12 * 60 && start < afternoonEnd) {
      issues.push(`afternoon outdoor forbidden: ${t.activity} at ${t.start}`);
    }
    const dur = parseTimeToMins(t.end) - start;
    if (dur > 25 && aqi > 150) {
      issues.push(`outdoor duration ${dur}min exceeds AQI cap for ${aqi}`);
    }
  }

  if (debug.aqiSource !== "fallback") {
    issues.push(`expected aqiSource fallback, got ${debug.aqiSource}`);
  }
  if (debug.confidence !== "low") {
    issues.push(`expected confidence low, got ${debug.confidence}`);
  }
  if (aqi !== 180) {
    issues.push(`expected India fallback AQI 180, got ${aqi}`);
  }

  const dishes = timeline.flatMap((t) => t.dishes ?? []);
  const riceCount = dishes.filter((d) => /rice/i.test(d)).length;
  const vegMeals = timeline.filter(
    (t) =>
      t.dishes?.some((d) => /vegetable|sabzi|sabji/i.test(d)) &&
      t.dishes?.some((d) => /rice/i.test(d)),
  );
  if (vegMeals.length > 1) {
    issues.push("rice+vegetables repeated across multiple meals");
  }

  return issues;
}

const { envContext, aqi, confidence, aqiSource, snapshot } =
  resolveEnvironmentWithFallback();

const builtContext = buildRoutineContext({
  country: INPUT.countryCode,
  hasSchool: INPUT.hasSchool,
  mood: INPUT.mood,
  weatherOutdoor: "limited",
  outdoorSuitability: envContext.outdoorSuitability,
  environmentalRiskScore: envContext.environmentalRiskScore,
  temperatureC: envContext.temperatureC,
  hydrationNeedLevel: envContext.hydrationNeedLevel,
  sensoryStressLevel: envContext.sensoryStressLevel,
  cognitiveComfortLevel: envContext.cognitiveComfortLevel,
  aqi,
  environment: {
    temperature: INPUT.environmentOverride.temperatureC,
    condition: "heatwave",
    AQI: aqi,
  },
});

const state = deriveBehavioralState(builtContext, {
  ageGroup: "early_school",
  ageInMonths: INPUT.age * 12,
});

const pipeline = runRoutineIntelligencePipeline({
  items: buildCanonicalBase().map((i) => ({ ...i })),
  scheduleOpts: {
    wakeUpTime: INPUT.wakeTime,
    sleepTime: INPUT.sleepTime,
    ageGroup: "early_school",
    hasSchool: INPUT.hasSchool,
    schoolStartMins: 9 * 60,
    schoolEndMins: 15 * 60,
  },
  builtContext,
  childProfile: { ageGroup: "early_school", ageInMonths: INPUT.age * 12 },
  ageInMonths: INPUT.age * 12,
  fridgeItems: INPUT.fridgeItems.join(", "),
  isVeg: true,
  mealSeed: 20260517,
});

const timeline = toTimeline(pipeline.items);
const hard = hardValidateSchedule(pipeline.items, INPUT.wakeTime, INPUT.sleepTime);
const mealValidation = validateMealActivityIntegration(pipeline.items);
const aqiWarnings = validateAqiOutdoorRules(pipeline.items, aqi, INPUT.countryCode);

const debug = {
  aqiSource,
  confidence,
  aqiResolved: aqi,
  snapshotSource: snapshot.source,
  environmentMode: state.dayPlanningMode,
  exposureMode: state.aqiExposureMode,
  mergedExposure: state.environmentSeverity?.mergedExposureMode ?? state.aqiExposureMode,
  allowOutdoor: state.allowOutdoor,
  maxOutdoorMinutes: state.maxOutdoorDurationFromAqi,
  blockAfternoonOutdoor: state.blockAfternoonOutdoor,
  preferEveningActivity: state.preferEveningActivity,
  aqiMetroAdvisoryMode: state.aqiMetroAdvisoryMode,
  keyAdjustments: [
    `API failure → country AQI fallback (${aqi})`,
    `Heat ${INPUT.environmentOverride.temperatureC}°C → ${state.dayPlanningMode}`,
    `AQI ${aqi} (IN tolerant) → ${state.aqiExposureMode}, max outdoor ${state.maxOutdoorDurationFromAqi ?? "—"} min`,
    state.blockAfternoonOutdoor ? "Afternoon outdoor blocked" : null,
    state.requireHydrationBreak ? "Hydration breaks added" : null,
    pipeline.reverted ? "Schedule reverted to pre-validation base" : null,
  ].filter(Boolean),
  validation: {
    hardValid: hard.valid,
    hardErrors: hard.errors,
    mealIntegration: mealValidation,
    aqiWarnings,
    custom: validate(timeline, aqi, state, { aqiSource, confidence }),
  },
};

const output = {
  routine: timeline,
  debug,
};

console.log(JSON.stringify(output, null, 2));
