/**
 * Three-case environmental resilience validation (India, age 8).
 * Run: node --import tsx/esm scripts/generate-env-resilience-three-cases.mjs
 */
import {
  buildEnvironmentalContext,
  buildExplanations,
  estimateAQIByCountry,
  fallbackAtmosphericSnapshot,
  finalizeSnapshot,
  normalizeSnapshot,
  mapAgeGroupToEnvAgeGroup,
} from "@workspace/environment";
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

const BASE = {
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
  fridgeItems: ["milk", "eggs", "bread", "rice", "vegetables"],
  goals: ["balanced development"],
};

const CASES = [
  {
    id: 1,
    title: "NORMAL API (BASELINE)",
    env: {
      AQI: 120,
      temperatureC: 32,
      condition: "clear",
      simulateApiFailure: false,
    },
    expect: {
      confidence: "high",
      aqiSource: "api",
    },
  },
  {
    id: 2,
    title: "PARTIAL FAILURE (AQI MISSING)",
    env: {
      AQI: null,
      temperatureC: 36,
      condition: "clear",
      simulateApiFailure: false,
    },
    expect: {
      confidence: "medium",
      aqiSource: "country_estimate",
    },
  },
  {
    id: 3,
    title: "FULL FAILURE (API DOWN)",
    env: {
      AQI: null,
      temperatureC: null,
      condition: null,
      simulateApiFailure: true,
    },
    expect: {
      confidence: "low",
      aqiSource: "fallback",
    },
  },
];

function resolveEnvironment(caseEnv) {
  const { countryCode, location } = BASE;
  let snapshot;
  let confidence;
  let aqiSource;

  if (caseEnv.simulateApiFailure) {
    snapshot = fallbackAtmosphericSnapshot(countryCode);
    if (caseEnv.temperatureC != null) {
      snapshot = {
        ...snapshot,
        temperatureC: caseEnv.temperatureC,
        apparentC: caseEnv.temperatureC,
      };
    }
    snapshot = normalizeSnapshot({ ...snapshot, source: "fallback" });
    aqiSource = "fallback";
    confidence = "low";
  } else {
    snapshot = normalizeSnapshot({
      observedAt: new Date().toISOString(),
      source: "open-meteo",
      temperatureC: caseEnv.temperatureC ?? undefined,
      apparentC: caseEnv.temperatureC ?? undefined,
      aqiUs: caseEnv.AQI ?? undefined,
    });
    const finalized = finalizeSnapshot(snapshot, countryCode);
    snapshot = finalized.snapshot;
    confidence = finalized.confidence;
    aqiSource = finalized.aqiRepaired ? "country_estimate" : "api";
    if (caseEnv.AQI != null) {
      snapshot = { ...snapshot, aqiUs: caseEnv.AQI };
      aqiSource = "api";
      confidence = "high";
    }
  }

  const aqi =
    caseEnv.AQI ??
    snapshot.aqiUs ??
    estimateAQIByCountry(countryCode);

  const temp =
    caseEnv.temperatureC ??
    snapshot.temperatureC ??
    snapshot.apparentC ??
    25;

  snapshot = {
    ...snapshot,
    aqiUs: aqi,
    temperatureC: temp,
    apparentC: temp,
  };

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

  return { envContext: ctx, aqi, confidence, aqiSource, snapshot, temperatureC: temp };
}

function buildCanonicalBase() {
  return enforceSchoolBlock(
    [
      {
        time: BASE.wakeTime,
        activity: "Wake up & freshen up",
        duration: 30,
        category: "morning_routine",
        status: "pending",
      },
      {
        time: BASE.schoolStart,
        activity: "At school",
        duration: 360,
        category: "school",
        status: "pending",
      },
      {
        time: BASE.sleepTime,
        activity: "Lights out",
        duration: 30,
        category: "sleep",
        status: "pending",
      },
    ],
    BASE.hasSchool,
    BASE.schoolStart,
    BASE.schoolEnd,
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
      const reason =
        it.scheduleDecision?.reason ??
        (it.culturalReason ? `Meal: ${it.culturalReason}` : undefined);
      if (reason) block.reason = reason;
      if (it.advisory) {
        block.advisory =
          it.advisory.warning || it.advisory.suggestion
            ? {
                warning: it.advisory.warning ?? it.advisory.message ?? "Air quality advisory",
                suggestion:
                  it.advisory.suggestion ??
                  (Array.isArray(it.advisory.actions)
                    ? it.advisory.actions.join("; ")
                    : "Limit outdoor exposure; stay hydrated."),
              }
            : {
                warning: it.advisory.message ?? "Air quality advisory",
                suggestion: it.advisory.actions?.join("; ") ?? "Use mask and limit outdoor time.",
              };
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

function validateCase(timeline, debug, expect) {
  const issues = [];
  const wake = timeline[0];
  const sleep = timeline[timeline.length - 1];
  if (!wake?.activity.match(/wake/i)) issues.push("wake not first");
  if (!sleep?.activity.match(/sleep|lights out/i)) issues.push("sleep not last");

  if (!timeline.find((t) => /refuel/i.test(t.activity))) {
    issues.push("missing after-school refuel");
  }
  if (!timeline.find((t) => /snack|drunch/i.test(t.activity))) {
    issues.push("missing afternoon snack");
  }
  if (!timeline.find((t) => /\bdinner\b/i.test(t.activity))) {
    issues.push("missing dinner");
  }

  const afternoonEnd = 17 * 60;
  for (const t of timeline.filter(isOutdoorBlock)) {
    const start = parseTimeToMins(t.start);
    if (start >= 12 * 60 && start < afternoonEnd) {
      issues.push(`afternoon outdoor: ${t.activity} @ ${t.start}`);
    }
  }

  const dinner = timeline.find((t) => /\bdinner\b/i.test(t.activity));
  if (dinner) {
    const dinnerStart = parseTimeToMins(dinner.start);
    const bad = timeline.filter(
      (t) =>
        parseTimeToMins(t.start) > dinnerStart + 5 &&
        parseTimeToMins(t.start) < parseTimeToMins(sleep.start) - 5 &&
        /soccer|sports practice|football|high-energy/i.test(t.activity),
    );
    if (bad.length) issues.push(`high-energy after dinner: ${bad.map((b) => b.activity).join(", ")}`);
  }

  if (debug.confidence !== expect.confidence) {
    issues.push(`confidence expected ${expect.confidence}, got ${debug.confidence}`);
  }
  if (debug.aqiSource !== expect.aqiSource) {
    issues.push(`aqiSource expected ${expect.aqiSource}, got ${debug.aqiSource}`);
  }

  for (let i = 1; i < timeline.length; i++) {
    const prevEnd = parseTimeToMins(timeline[i - 1].end);
    const curStart = parseTimeToMins(timeline[i].start);
    if (curStart < prevEnd - 2) {
      issues.push(`overlap: ${timeline[i - 1].activity} / ${timeline[i].activity}`);
    }
  }

  return issues;
}

function weatherConditionFromTemp(temp, aqi) {
  if (temp >= 36) return "heatwave";
  if (temp >= 32) return "sunny";
  return "clear";
}

function runCase(caseDef, mealSeed) {
  const { envContext, aqi, confidence, aqiSource, snapshot, temperatureC } =
    resolveEnvironment(caseDef.env);

  const condition =
    caseDef.env.condition ??
    envContext.weatherCondition ??
    weatherConditionFromTemp(temperatureC, aqi);

  const builtContext = buildRoutineContext({
    country: BASE.countryCode,
    hasSchool: BASE.hasSchool,
    mood: BASE.mood,
    weatherOutdoor: envContext.outdoorSuitability === "no" ? "no" : "limited",
    outdoorSuitability: envContext.outdoorSuitability,
    environmentalRiskScore: envContext.environmentalRiskScore,
    temperatureC,
    hydrationNeedLevel: envContext.hydrationNeedLevel,
    sensoryStressLevel: envContext.sensoryStressLevel,
    cognitiveComfortLevel: envContext.cognitiveComfortLevel,
    aqi,
    environment: { temperature: temperatureC, condition, AQI: aqi },
    environmentDataConfidence: confidence,
  });

  const state = deriveBehavioralState(builtContext, {
    ageGroup: "early_school",
    ageInMonths: BASE.age * 12,
  });

  const pipeline = runRoutineIntelligencePipeline({
    items: buildCanonicalBase().map((i) => ({ ...i })),
    scheduleOpts: {
      wakeUpTime: BASE.wakeTime,
      sleepTime: BASE.sleepTime,
      ageGroup: "early_school",
      hasSchool: BASE.hasSchool,
      schoolStartMins: 9 * 60,
      schoolEndMins: 15 * 60,
    },
    builtContext,
    childProfile: { ageGroup: "early_school", ageInMonths: BASE.age * 12 },
    ageInMonths: BASE.age * 12,
    fridgeItems: BASE.fridgeItems.join(", "),
    isVeg: true,
    mealSeed,
  });

  const timeline = toTimeline(pipeline.items);
  const outdoorBlocks = timeline.filter(isOutdoorBlock);

  const debug = {
    aqiSource,
    confidence,
    aqiResolved: aqi,
    temperatureC,
    snapshotSource: snapshot.source,
    exposureMode: state.aqiExposureMode,
    dayPlanningMode: state.dayPlanningMode,
    outdoorAllowed: state.allowOutdoor,
    outdoorDurationApplied: outdoorBlocks.map((t) => ({
      activity: t.activity,
      start: t.start,
      end: t.end,
      minutes: parseTimeToMins(t.end) - parseTimeToMins(t.start),
    })),
    maxOutdoorMinutesPolicy: state.maxOutdoorDurationFromAqi,
    keyAdjustments: [
      `AQI ${aqi} (${aqiSource}) · confidence ${confidence}`,
      `Temp ${temperatureC}°C → ${state.dayPlanningMode}`,
      `Exposure ${state.aqiExposureMode} · outdoor ${state.allowOutdoor ? "yes" : "no"}`,
      state.blockAfternoonOutdoor ? "Afternoon outdoor blocked (heat)" : null,
      outdoorBlocks.length
        ? `Evening outdoor: ${outdoorBlocks.map((o) => o.activity).join(", ")}`
        : "No outdoor blocks scheduled",
    ].filter(Boolean),
    validationIssues: [],
  };

  const hard = hardValidateSchedule(pipeline.items, BASE.wakeTime, BASE.sleepTime);
  debug.validationIssues = validateCase(timeline, debug, caseDef.expect);
  if (!hard.valid) debug.validationIssues.push(...hard.errors);

  return {
    caseId: caseDef.id,
    title: caseDef.title,
    routine: timeline,
    debug,
    valid: debug.validationIssues.length === 0 && hard.valid,
  };
}

const results = CASES.map((c, i) => runCase(c, 20260517 + c.id * 1000 + i));

console.log(JSON.stringify({ cases: results }, null, 2));
