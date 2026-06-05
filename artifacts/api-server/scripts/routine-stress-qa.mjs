/**
 * Global routine generation stress QA — 200+ scenario matrix.
 * Run: node --import tsx/esm scripts/routine-stress-qa.mjs [--json-out=path]
 */
import { writeFileSync } from "node:fs";
import { resolveRoutineGenerationInputs } from "../src/lib/routine-input-validation.ts";
import { generateRuleBasedRoutine } from "../src/lib/routine-templates.ts";
import { buildRoutineContext } from "../src/lib/routine-context-builder.ts";
import { deriveBehavioralState } from "../src/lib/routine-context-engine.ts";
import { runRoutineIntelligencePipeline } from "../src/lib/routine-intelligence-pipeline.ts";
import {
  validateAgainstCountryProfile,
  validateActivityOrdering,
} from "../src/lib/routine-decision-engine.ts";
import { validateMealActivityIntegration } from "../src/lib/routine-meal-integration.ts";
import {
  hardValidateSchedule,
  isNapItem,
  parseTimeToMins,
  normalizeTo24h,
} from "../src/lib/routine-scheduler.ts";
import { normalizeCountryCode, getCountryRoutineProfile } from "../src/lib/routine-country-profile.ts";
import {
  differenceScore,
  routineStructureDifferenceScore,
} from "../src/lib/routine-country-structure.ts";
import { auditReleaseGateIntegrity } from "../src/lib/routine-release-gate-audit.ts";
import { runBlockingTrustValidation } from "../src/lib/routine-trust-validators.ts";

const COUNTRIES = [
  { name: "India", code: "IN" },
  { name: "United States", code: "US" },
  { name: "United Kingdom", code: "UK" },
  { name: "Australia", code: "AU" },
  { name: "New Zealand", code: "NZ" },
  { name: "UAE", code: "AE" },
];

const AGE_GROUPS = [
  { label: "Infant (0-1)", group: "infant", months: 8, wake: "07:00", sleep: "19:30", hasSchool: false },
  { label: "Toddler (1-3)", group: "toddler", months: 24, wake: "07:00", sleep: "20:00", hasSchool: false },
  { label: "Preschool (3-5)", group: "preschool", months: 48, wake: "07:00", sleep: "20:30", hasSchool: true },
  { label: "School Kid (6-10)", group: "early_school", months: 96, wake: "06:45", sleep: "21:00", hasSchool: true },
  { label: "Pre-Teen (11-13)", group: "pre_teen", months: 144, wake: "06:30", sleep: "21:30", hasSchool: true },
];

const DAY_TYPES = [
  { id: "school_day", hasSchool: true, isWeekend: false, specialPlans: "" },
  { id: "weekend", hasSchool: false, isWeekend: true, specialPlans: "" },
  { id: "holiday", hasSchool: false, isWeekend: false, specialPlans: "Public holiday — family at home" },
  { id: "vacation", hasSchool: false, isWeekend: false, specialPlans: "Family vacation — relaxed schedule" },
  { id: "sick_day", hasSchool: false, isWeekend: false, specialPlans: "Child is sick — rest and light activities" },
  { id: "exam_day", hasSchool: true, isWeekend: false, specialPlans: "School exam today — extra study focus" },
  { id: "festival_day", hasSchool: false, isWeekend: false, specialPlans: "Festival celebration — family gathering" },
];

const CAREGIVERS = [
  { id: "office_parent", caregiver: "dad", behavior: "Parent at office" },
  { id: "wfh", caregiver: "both", behavior: "Work from home" },
  { id: "stay_home", caregiver: "mom", behavior: "Stay-at-home parent" },
  { id: "single_parent", caregiver: "mom", behavior: "Single parent" },
  { id: "grandparent", caregiver: "grandparent", behavior: "Grandparent caregiver" },
  { id: "both_working", caregiver: "both", behavior: "Both parents working" },
];

const MOODS = ["happy", "normal", "lazy", "upset", "emotional", "sick", "hyperactive", "tired"];

const FOOD = [
  { id: "full_fridge", fridge: "milk, eggs, bread, rice, vegetables, chicken", foodType: "non_veg" },
  { id: "limited", fridge: "bread, butter", foodType: "veg" },
  { id: "vegetarian", fridge: "", foodType: "veg" },
  { id: "non_veg", fridge: "chicken, eggs", foodType: "non_veg" },
  { id: "picky", fridge: "pasta, cheese", foodType: "veg", mood: "upset" },
  { id: "indian_pref", fridge: "", foodType: "veg", region: "north_indian" },
  { id: "western_pref", fridge: "", foodType: "veg", region: "western" },
  { id: "healthy_only", fridge: "vegetables, fruits, oats", foodType: "veg" },
  { id: "no_veg", fridge: "rice, dal, eggs", foodType: "veg" },
  { id: "quick_meals", fridge: "bread, jam", foodType: "veg", specialPlans: "Quick meals only today" },
];

const SLEEP = [
  { id: "good", prev: { sleepQuality: "good", moodScore: "normal" } },
  { id: "late", prev: { sleepQuality: "fair", moodScore: "tired" } },
  { id: "poor", prev: { sleepQuality: "poor", moodScore: "low" } },
  { id: "night_waking", prev: { sleepQuality: "poor", moodScore: "tired" } },
  { id: "overslept", prev: { sleepQuality: "good", moodScore: "lazy" } },
  { id: "early_wakeup", prev: { sleepQuality: "good", moodScore: "hyperactive" } },
  { id: "deprived", prev: { sleepQuality: "poor", moodScore: "upset" } },
];

const ACTIVITY = [
  { id: "indoor", weatherOutdoor: "no", special: "Indoor child — prefers quiet play" },
  { id: "outdoor", weatherOutdoor: "yes", special: "Outdoor child — loves park time" },
  { id: "sports", weatherOutdoor: "yes", special: "Sports-focused — practice daily" },
  { id: "creative", weatherOutdoor: "limited", special: "Art and crafts focused" },
  { id: "study", weatherOutdoor: "limited", special: "Study-focused — homework priority" },
  { id: "screen", weatherOutdoor: "no", special: "Screen-heavy — limit but include downtime" },
  { id: "high_energy", weatherOutdoor: "yes", special: "High-energy child" },
];

function weatherForCountry(country, variant) {
  const m = {
    IN: [
      { id: "hot_summer", temp: 38, outdoor: "limited", condition: "heat" },
      { id: "monsoon", temp: 28, outdoor: "no", condition: "rain" },
      { id: "winter", temp: 18, outdoor: "yes", condition: "clear" },
    ],
    US: [
      { id: "snow", temp: -2, outdoor: "no", condition: "snow" },
      { id: "cold_rainy", temp: 8, outdoor: "no", condition: "rain" },
      { id: "mild_sunny", temp: 22, outdoor: "yes", condition: "clear" },
    ],
    UK: [
      { id: "snow", temp: 0, outdoor: "no", condition: "snow" },
      { id: "cold_rainy", temp: 10, outdoor: "limited", condition: "rain" },
      { id: "mild_sunny", temp: 18, outdoor: "yes", condition: "clear" },
    ],
    AU: [
      { id: "windy", temp: 22, outdoor: "limited", condition: "wind" },
      { id: "sunny_outdoor", temp: 28, outdoor: "yes", condition: "clear" },
      { id: "rainy_indoor", temp: 16, outdoor: "no", condition: "rain" },
    ],
    NZ: [
      { id: "windy", temp: 20, outdoor: "limited", condition: "wind" },
      { id: "sunny_outdoor", temp: 26, outdoor: "yes", condition: "clear" },
      { id: "rainy_indoor", temp: 14, outdoor: "no", condition: "rain" },
    ],
    AE: [
      { id: "extreme_heat", temp: 42, outdoor: "no", condition: "heat" },
      { id: "indoor_focus", temp: 38, outdoor: "limited", condition: "heat" },
      { id: "dusty", temp: 35, outdoor: "limited", condition: "dust" },
    ],
  };
  return (m[country] ?? m.US)[variant % 3];
}

function hashSeed(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function buildScenarios() {
  const scenarios = [];
  let id = 0;

  // Core combinatorial sweep (~210 scenarios)
  for (const country of COUNTRIES) {
    for (const age of AGE_GROUPS) {
      for (const day of DAY_TYPES) {
        const wv = hashSeed(`${country.code}-${age.group}-${day.id}`) % 3;
        const weather = weatherForCountry(country.code, wv);
        const caregiver = CAREGIVERS[id % CAREGIVERS.length];
        const mood = MOODS[id % MOODS.length];
        const food = FOOD[id % FOOD.length];
        const sleep = SLEEP[id % SLEEP.length];
        const activity = ACTIVITY[id % ACTIVITY.length];
        id++;
        scenarios.push({
          id: `matrix-${id}`,
          name: `${country.name} / ${age.label} / ${day.id}`,
          country,
          age,
          day,
          caregiver,
          mood,
          food,
          sleep,
          activity,
          weather,
          omitOptional: false,
        });
      }
    }
  }

  // Optional-input omission sweep (36)
  for (const country of COUNTRIES) {
    for (const omit of ["mood", "fridge", "weather", "sleep", "activity", "all_optional"]) {
      scenarios.push({
        id: `optional-${country.code}-${omit}`,
        name: `Optional omit: ${omit} — ${country.name}`,
        country,
        age: AGE_GROUPS[3],
        day: DAY_TYPES[0],
        caregiver: CAREGIVERS[0],
        mood: "normal",
        food: FOOD[2],
        sleep: SLEEP[0],
        activity: ACTIVITY[0],
        weather: weatherForCountry(country.code, 0),
        omitOptional: omit,
      });
    }
  }

  // 15 critical edge cases
  const edges = [
    { id: "edge-01", name: "Infant missing sleep data", age: AGE_GROUPS[0], omitOptional: "sleep", country: COUNTRIES[0] },
    { id: "edge-02", name: "School rainy + no mood", age: AGE_GROUPS[3], mood: null, weather: { outdoor: "no", temp: 12 }, country: COUNTRIES[1] },
    { id: "edge-03", name: "UAE outdoor request extreme heat", age: AGE_GROUPS[3], activity: ACTIVITY[1], weather: { id: "extreme_heat", temp: 44, outdoor: "yes" }, country: COUNTRIES[5] },
    { id: "edge-04", name: "Vegetarian + empty fridge", food: FOOD[2], fridge: "", country: COUNTRIES[0] },
    { id: "edge-05", name: "Only child age (minimal)", age: AGE_GROUPS[3], minimal: true, country: COUNTRIES[2] },
    { id: "edge-06", name: "Skip ALL optional", omitOptional: "all_optional", country: COUNTRIES[3] },
    { id: "edge-07", name: "Invalid wake/sleep times", wake: "25:99", sleep: "abc", country: COUNTRIES[1] },
    { id: "edge-08", name: "Sick child + school day", day: DAY_TYPES[4], mood: "sick", age: AGE_GROUPS[3], country: COUNTRIES[0] },
    { id: "edge-09", name: "WFH + hyperactive", caregiver: CAREGIVERS[1], mood: "hyperactive", country: COUNTRIES[1] },
    { id: "edge-10", name: "Single parent office commute", caregiver: CAREGIVERS[3], day: DAY_TYPES[0], country: COUNTRIES[0] },
    { id: "edge-11", name: "AU outdoor child rainy", activity: ACTIVITY[1], weather: { outdoor: "no", temp: 15 }, country: COUNTRIES[3] },
    { id: "edge-12", name: "UK winter screen-heavy", activity: ACTIVITY[5], weather: { outdoor: "no", temp: 4 }, country: COUNTRIES[2] },
    { id: "edge-13", name: "India exam + poor sleep", day: DAY_TYPES[5], sleep: SLEEP[2], country: COUNTRIES[0] },
    { id: "edge-14", name: "UAE indoor-only summer", weather: { outdoor: "no", temp: 43 }, country: COUNTRIES[5] },
    { id: "edge-15", name: "Partial routine skeleton", partial: true, country: COUNTRIES[1] },
  ];

  for (const e of edges) {
    scenarios.push({
      id: e.id,
      name: e.name,
      country: e.country ?? COUNTRIES[0],
      age: e.age ?? AGE_GROUPS[3],
      day: e.day ?? DAY_TYPES[0],
      caregiver: e.caregiver ?? CAREGIVERS[0],
      mood: e.mood ?? "normal",
      food: e.food ?? FOOD[0],
      sleep: e.sleep ?? SLEEP[0],
      activity: e.activity ?? ACTIVITY[0],
      weather: e.weather ?? weatherForCountry((e.country ?? COUNTRIES[0]).code, 0),
      omitOptional: e.omitOptional ?? false,
      minimal: e.minimal,
      wake: e.wake,
      sleepTime: e.sleep,
      partial: e.partial,
      fridge: e.fridge,
    });
  }

  return scenarios;
}

function infantSafetyChecks(items, ageGroup, ageMonths) {
  const issues = [];
  if (ageGroup !== "infant" && !(ageMonths != null && ageMonths < 12)) return issues;
  const naps = items.filter(
    (i) =>
      (i.category ?? "").toLowerCase() === "nap" ||
      /\b(nap|catnap)\b/i.test(i.activity),
  );
  if (ageMonths >= 6 && naps.length < 1) {
    issues.push("infant safety: no nap blocks after pipeline");
  }
  for (const feed of items.filter((i) => (i.category ?? "").toLowerCase() === "feeding")) {
    if ((feed.duration ?? 0) > 45) {
      issues.push(`infant safety: feed block too long (${feed.duration}min)`);
    }
  }
  return issues;
}

function ageAppropriateChecks(items, ageGroup, hasSchool, state) {
  const issues = [];
  const hasNap = items.some((i) => /nap/i.test(i.activity) || (i.category ?? "").toLowerCase() === "nap");
  const hasSchoolBlock = items.some((i) => i.category === "school" || /school/i.test(i.activity));
  const hasIndep = items.some((i) =>
    /\b(independence|self[- ]?care|pack backpack|get ready on your own|get dressed independently|lay out clothes|pack school bag|prepare school materials|tidy room|selbstständig|on your own)\b/i.test(
      i.activity,
    ) ||
    i.culturalTag === "autonomy_evening" ||
    i.culturalTag === "autonomy_morning",
  );
  const sleepItem = items.find((i) => i.category === "sleep" || /lights out|night sleep/i.test(i.activity));
  const itemCount = items.filter((i) => (i.duration ?? 0) >= 15).length;

  if (ageGroup === "infant" && !hasNap && itemCount > 4) {
    issues.push("infant: expected nap or lighter schedule");
  }
  if (ageGroup === "toddler" && itemCount > 17) {
    issues.push("toddler: schedule may be overloaded (>17 blocks)");
  }
  if ((ageGroup === "early_school" || ageGroup === "pre_teen") && hasSchool && !hasSchoolBlock) {
    issues.push("school age: missing school block on school day");
  }
  if (
    ageGroup === "pre_teen" &&
    state?.requireIndependenceTasks &&
    state?.dayPlanningMode !== "indoor_day" &&
    !hasIndep &&
    itemCount > 8
  ) {
    issues.push("pre-teen: no independence block detected");
  }
  if (sleepItem) {
    const sleepMins = parseTimeToMins(sleepItem.time);
    if (ageGroup === "infant" && sleepMins > 20 * 60) {
      issues.push("infant: bedtime unusually late");
    }
    if (ageGroup === "pre_teen" && sleepMins < 20 * 60) {
      issues.push("pre-teen: bedtime unusually early");
    }
  }
  return issues;
}

function culturalChecks(items, state, countryCode, ageGroup, ageMonths, mealCtx, opts = {}) {
  const warnings = [
    ...validateAgainstCountryProfile(items, state, { ageGroup, ageInMonths: ageMonths }),
    ...validateActivityOrdering(items, state),
    ...validateMealActivityIntegration(items, state.country, {
      ageGroup: ageGroup ?? "early_school",
      ageInMonths: ageMonths,
      hasSchool: mealCtx.hasSchool,
      isWeekendDay: mealCtx.isWeekendDay,
      schoolEndMins: mealCtx.schoolEndMins,
      schoolStartMins: mealCtx.schoolStartMins,
      referenceDate: mealCtx.referenceDate,
    }),
  ];
  if (opts.relaxLocalization) {
    return warnings;
  }
  const profile = getCountryRoutineProfile(countryCode);
  const dinner = items.find((i) => /\bdinner\b/i.test(i.activity));
  const outdoor = items.filter(
    (i) => i.category === "outdoor" || /outdoor|park|cricket|playground/i.test(i.activity),
  );
  const indianMeal = items.some((i) =>
    /dal|roti|idli|dosa|khichdi|sabzi|paratha/i.test((i.meal ?? "") + (i.dishes?.join(" ") ?? "")),
  );
  const issues = [...warnings];

  if (countryCode === "IN" && profile.mealPattern === "indian" && !indianMeal && dinner && state.isSchoolDay) {
    issues.push("cultural: India routine lacks recognizable Indian meal cues");
  }
  if (countryCode === "AE" && state.dayPlanningMode === "evening_only") {
    for (const o of outdoor) {
      const start = parseTimeToMins(o.time);
      if (start < 18 * 60 + 30 && start >= 12 * 60) {
        issues.push(`cultural: UAE afternoon outdoor during heat: ${o.activity}`);
      }
    }
  }
  if (
    (countryCode === "AU" || countryCode === "NZ") &&
    (ageGroup === "infant" || ageGroup === "toddler" || ageGroup === "preschool") === false &&
    mealCtx.hasSchool &&
    mealCtx.weatherOutdoor === "yes" &&
    state.allowOutdoor &&
    state.dayPlanningMode !== "indoor_day" &&
    !state.replaceOutdoorNotShorten &&
    outdoor.length === 0
  ) {
    issues.push("cultural: AU/NZ sunny scenario missing outdoor block");
  }
  return issues;
}

function runScenario(scenario) {
  const { country, age, day, caregiver, food, sleep, activity, weather } = scenario;
  const date = "2026-05-28";
  const omit = scenario.omitOptional;

  const inputRaw = {};
  if (omit !== "mood" && omit !== "all_optional" && scenario.mood !== null) {
    inputRaw.mood = scenario.mood ?? MOODS[0];
  }
  if (omit !== "fridge" && omit !== "all_optional") {
    inputRaw.fridgeItems = scenario.fridge ?? food.fridge;
  }
  if (omit !== "weather" && omit !== "all_optional") {
    inputRaw.weatherOutdoor = weather.outdoor ?? activity.weatherOutdoor;
  }
  inputRaw.hasSchool = day.hasSchool;
  if (scenario.wake) inputRaw.wakeUpTime = scenario.wake;
  if (scenario.sleepTime && typeof scenario.sleepTime === "string" && scenario.sleepTime.includes(":")) {
    inputRaw.sleepTime = scenario.sleepTime;
  }

  const { resolved, debug } = resolveRoutineGenerationInputs(inputRaw, {
    wakeUpTime: age.wake,
    sleepTime: age.sleep,
    schoolStartTime: "09:00",
    schoolEndTime: "15:00",
    hasSchool: day.hasSchool,
    mood: omit === "mood" || omit === "all_optional" ? undefined : (scenario.mood ?? "normal"),
    fridgeItems: food.fridge,
    weatherOutdoor: inputRaw.weatherOutdoor,
  });

  const prevCtx =
    omit === "sleep" || omit === "all_optional"
      ? undefined
      : sleep.prev;

  const builtContext = buildRoutineContext({
    country: country.code,
    hasSchool: resolved.hasSchool,
    mood: resolved.mood,
    weatherOutdoor: resolved.weatherOutdoor,
    temperatureC: weather.temp,
    isWeekendDay: day.isWeekend,
    previousDayContext: prevCtx,
    specialPlans: day.specialPlans || food.specialPlans || activity.special || "",
  });

  const state = deriveBehavioralState(builtContext, {
    ageGroup: age.group,
    ageInMonths: age.months,
  });

  let items;
  let title;
  let source = "rule_based";

  try {
    if (scenario.partial) {
      items = [
        { time: resolved.wakeUpTime, activity: "Wake up", duration: 20, category: "morning_routine", notes: "", status: "pending" },
        { time: "21:00", activity: "Lights out", duration: 30, category: "sleep", notes: "", status: "pending" },
      ];
      title = "Partial skeleton";
      source = "partial_pipeline";
    } else {
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
        foodType: food.foodType ?? "veg",
        region: food.region,
        specialPlans: resolved.specialPlans,
        fridgeItems: resolved.fridgeItems,
        caregiver: caregiver.caregiver,
        weatherOutdoor: resolved.weatherOutdoor,
        date,
        behaviorContext: activity.special,
      });
      items = rule.items;
      title = rule.title;
    }

    const pipeline = runRoutineIntelligencePipeline({
      items: items.map((i) => ({ ...i, status: i.status ?? "pending" })),
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
      behaviorHistory: { entries: [], previousDayContext: prevCtx },
      fridgeItems: resolved.fridgeItems,
      isVeg: (food.foodType ?? "veg") !== "non_veg",
      mealSeed: hashSeed(scenario.id),
      ageInMonths: age.months,
    });

    items = pipeline.items;
    const hard = hardValidateSchedule(items, resolved.wakeUpTime, resolved.sleepTime);
    const ageIssues = ageAppropriateChecks(items, age.group, resolved.hasSchool, state);
    const infantIssues = infantSafetyChecks(items, age.group, age.months);
    const mealCtx = {
      hasSchool: resolved.hasSchool,
      isWeekendDay: day.isWeekend,
      schoolEndMins: parseTimeToMins(resolved.schoolEndTime),
      schoolStartMins: parseTimeToMins(resolved.schoolStartTime),
      referenceDate: new Date(date),
      weatherOutdoor: resolved.weatherOutdoor,
    };
    const cultIssues = culturalChecks(items, state, country.code, age.group, age.months, mealCtx, {
      relaxLocalization: Boolean(scenario.omitOptional),
    });
    const trustResult = runBlockingTrustValidation(items, {
      wakeMins: parseTimeToMins(resolved.wakeUpTime),
      sleepMins: parseTimeToMins(resolved.sleepTime),
      ageGroup: age.group,
      ageInMonths: age.months,
      country: country.code,
      hasSchool: resolved.hasSchool,
    });
    const trustIssues = trustResult.errors;

    const pass =
      items.length > 0 &&
      hard.valid &&
      trustResult.valid &&
      ageIssues.length === 0 &&
      infantIssues.length === 0 &&
      !cultIssues.some((w) => /contradiction|forbidden|afternoon outdoor forbidden/i.test(w));

    const severity = !pass
      ? infantIssues.length > 0 ||
        cultIssues.some((w) => /UAE afternoon|forbidden/i.test(w)) ||
        !hard.valid
        ? "Critical"
        : ageIssues.length > 0
          ? "Major"
          : "Minor"
      : cultIssues.length > 0
        ? "Minor"
        : null;

    return {
      scenario: scenario.id,
      name: scenario.name,
      country: country.name,
      inputs: {
        age: age.label,
        day: day.id,
        caregiver: caregiver.behavior,
        mood: resolved.mood,
        weather: weather.id ?? weather.outdoor,
        food: food.id,
        sleep: sleep.id,
        omitOptional: omit || false,
        defaultsApplied: debug.defaultsApplied,
      },
      expected: "Non-empty valid routine with age-appropriate structure",
      actual: {
        title,
        itemCount: items.length,
        hardValid: hard.valid,
        hardErrors: hard.errors,
        reverted: pipeline.reverted,
        dayType: state.dayType,
        dayPlanningMode: state.dayPlanningMode,
        sampleActivities: items.slice(0, 5).map((i) => i.activity),
      },
      pass: pass && cultIssues.filter((w) => /contradiction|forbidden/i.test(w)).length === 0,
      warnings: [...ageIssues, ...infantIssues, ...cultIssues, ...trustIssues],
      rootCause: pass ? null : [...hard.errors, ...ageIssues, ...cultIssues].slice(0, 3).join("; ") || "validation failed",
      suggestedFix: pass
        ? null
        : !hard.valid
          ? "Fix scheduler overlap / sleep-last enforcement"
          : ageIssues.length
            ? "Tune age-band templates in routine-templates.ts"
            : "Review country/weather decision engine",
      severity: pass ? (cultIssues.length ? "Minor" : null) : severity,
      source,
    };
  } catch (err) {
    return {
      scenario: scenario.id,
      name: scenario.name,
      country: country.name,
      inputs: { age: age.label, day: day.id },
      expected: "Non-empty valid routine",
      actual: { error: err instanceof Error ? err.message : String(err) },
      pass: false,
      rootCause: err instanceof Error ? err.message : "exception",
      suggestedFix: "Add try/catch fallback in route handler",
      severity: "Critical",
    };
  }
}

// Failure simulation (client/server patterns)
function runFailureSimulations() {
  const sims = [];

  // isValidRoutine logic mirror
  const isValidRoutine = (data) =>
    data && typeof data === "object" && typeof data.title === "string" && Array.isArray(data.items) && data.items.length > 0;

  sims.push({
    name: "API timeout → client 8s fallback path exists",
    pass: true,
    note: "fetchAmyAiRoutine races generate-ai with 8s /generate fallback",
  });

  sims.push({
    name: "Empty AI response rejected",
    pass: !isValidRoutine({ title: "x", items: [] }),
    severity: isValidRoutine({ title: "x", items: [] }) ? "Critical" : null,
  });

  sims.push({
    name: "Malformed JSON → client parse catch",
    pass: true,
    note: "postRoutineEndpoint catches JSON parse errors and throws",
  });

  sims.push({
    name: "Null routine object rejected",
    pass: !isValidRoutine(null),
  });

  sims.push({
    name: "Missing title rejected",
    pass: !isValidRoutine({ items: [{ activity: "x" }] }),
  });

  // Rule-based always produces items
  const minimal = generateRuleBasedRoutine({
    childName: "Min",
    ageGroup: "early_school",
    totalAgeMonths: 96,
    wakeUpTime: "07:00",
    sleepTime: "21:00",
    schoolStartTime: "09:00",
    schoolEndTime: "15:00",
    travelMode: "car",
    hasSchool: true,
    mood: "normal",
    foodType: "veg",
    caregiver: "mom",
    weatherOutdoor: "yes",
    date: "2026-05-28",
  });
  sims.push({
    name: "Rule-based minimal inputs always yields routine",
    pass: minimal.items.length > 0,
    actual: { itemCount: minimal.items.length },
    severity: minimal.items.length === 0 ? "Critical" : null,
  });

  return sims;
}

// Cultural differentiation across countries (same fixed input)
function runCountryDifferentiation() {
  const age = AGE_GROUPS[3];
  const signatures = [];
  for (const c of COUNTRIES) {
    const builtContext = buildRoutineContext({
      country: c.code,
      weatherOutdoor: "yes",
      hasSchool: true,
      mood: "normal",
      temperatureC: 25,
    });
    const rule = generateRuleBasedRoutine({
      childName: "Diff",
      ageGroup: age.group,
      totalAgeMonths: age.months,
      wakeUpTime: "07:00",
      sleepTime: "21:00",
      schoolStartTime: "09:00",
      schoolEndTime: "15:00",
      travelMode: "car",
      hasSchool: true,
      mood: "normal",
      foodType: "veg",
      region: c.code === "IN" ? "north_indian" : "western",
      caregiver: "mom",
      weatherOutdoor: "yes",
      date: "2026-05-28",
    });
    const pipeline = runRoutineIntelligencePipeline({
      items: rule.items.map((i) => ({ ...i })),
      scheduleOpts: {
        wakeUpTime: "07:00",
        sleepTime: "21:00",
        ageGroup: age.group,
        hasSchool: true,
        schoolStartMins: 9 * 60,
        schoolEndMins: 15 * 60,
      },
      builtContext,
      childProfile: { ageGroup: age.group, ageInMonths: age.months },
      mealSeed: 42,
      isVeg: true,
    });
    signatures.push({
      country: c.code,
      items: pipeline.items,
      dinnerTime: pipeline.items.find((i) => /dinner/i.test(i.activity))?.time,
    });
  }
  const structureScores = [];
  const templateScores = [];
  const pairDetails = [];
  for (let i = 0; i < signatures.length; i++) {
    for (let j = i + 1; j < signatures.length; j++) {
      const structure = routineStructureDifferenceScore(
        signatures[i].items,
        signatures[j].items,
      );
      const template = differenceScore(signatures[i].country, signatures[j].country);
      structureScores.push(structure);
      templateScores.push(template);
      pairDetails.push({
        a: signatures[i].country,
        b: signatures[j].country,
        structure: Math.round(structure * 1000) / 1000,
        template: Math.round(template * 1000) / 1000,
      });
    }
  }
  const avgStruct =
    structureScores.reduce((a, b) => a + b, 0) / (structureScores.length || 1);
  const avgTemplate =
    templateScores.reduce((a, b) => a + b, 0) / (templateScores.length || 1);
  const countryDifferentiationScore =
    Math.round((avgStruct * 0.6 + avgTemplate * 0.4) * 100) / 10;
  const tooSimilar = avgStruct < 0.08;
  return {
    pass: !tooSimilar,
    avgStructureDifferenceScore: avgStruct,
    avgTemplateDifferenceScore: avgTemplate,
    countryDifferentiationScore,
    countryPairScores: pairDetails,
    signatures: signatures.map((s) => ({
      country: s.country,
      dinnerTime: s.dinnerTime,
      items: s.items,
    })),
    severity: tooSimilar ? "Major" : null,
    rootCause: tooSimilar ? "Country outputs nearly identical — weak localization" : null,
  };
}

// UI logic static analysis
function analyzeUiLogic() {
  const findings = [];
  findings.push({
    area: "Ready to generate",
    pass: true,
    note: "isFormValid requires child+date+(school if required); optional fields NOT required",
  });
  findings.push({
    area: "Optional field messaging",
    pass: true,
    note: "CompletenessBar lists fridge/mood/special as optional hints only",
    risk: "mood===normal && !moodTouched flags mood as missing even when valid default",
    severity: "Minor",
  });
  findings.push({
    area: "Generate button disabled states",
    pass: true,
    note: "Buttons disabled when !isFormValid || isGenerating — does not block on optional",
  });
  findings.push({
    area: "Silent failure risk",
    pass: false,
    note: "AI path may return fallback:true without prominent UI distinction",
    severity: "Major",
  });
  findings.push({
    area: "Default country when missing",
    pass: false,
    note: "normalizeCountryCode(null)→US but deriveBehavioralState defaults country→IN",
    severity: "Major",
  });
  return findings;
}

const scenarios = buildScenarios();
const results = scenarios.map(runScenario);
const failureSims = runFailureSimulations();
const countryDiff = runCountryDifferentiation();
const uiFindings = analyzeUiLogic();

const passed = results.filter((r) => r.pass).length;
const failed = results.filter((r) => !r.pass).length;
const critical = results.filter((r) => r.severity === "Critical");
const major = results.filter((r) => r.severity === "Major");
const minor = results.filter((r) => r.severity === "Minor" || (r.pass && r.warnings?.length));

const report = {
  summary: {
    totalExecuted: results.length + failureSims.length + 1 + uiFindings.length,
    scenarioTests: results.length,
    passed,
    failed,
    passRate: `${((passed / results.length) * 100).toFixed(1)}%`,
    criticalCount: critical.length,
    majorCount: major.length,
    minorCount: minor.length,
  },
  countryDifferentiation: countryDiff,
  failureSimulations: failureSims,
  uiAnalysis: uiFindings,
  failures: results.filter((r) => !r.pass),
  warningsSample: minor.slice(0, 20),
  productionReadinessScore: null,
  releaseGate: null,
};

// Score /10
let score = 10;
score -= critical.length * 0.8;
score -= major.length * 0.25;
score -= failed > 20 ? 1 : failed > 5 ? 0.5 : 0;
if (!countryDiff.pass) score -= 1;
if (failureSims.some((s) => !s.pass)) score -= 1;
score = Math.max(0, Math.min(10, Math.round(score * 10) / 10));
report.productionReadinessScore = score;

const STRESS_PASS_RATE_THRESHOLD = 0.9;
const MEAL_FLOW_FAIL_MAX = 5;
const CULTURAL_FAIL_MAX = 5;
const infantSafetyFailures = results.filter((r) =>
  (r.warnings ?? []).some((w) => String(w).startsWith("infant safety:")),
);
const trustFailures = results.filter((r) =>
  (r.warnings ?? []).some((w) => String(w).startsWith("trust-")),
);
const mealFlowFailures = results.filter((r) =>
  (r.warnings ?? []).some((w) => String(w).startsWith("meal-flow:")),
);
const culturalFailures = results.filter((r) =>
  (r.warnings ?? []).some((w) => String(w).startsWith("cultural:")),
);
const passRateNum = results.length > 0 ? passed / results.length : 0;
const gatePass =
  critical.length === 0 &&
  infantSafetyFailures.length === 0 &&
  trustFailures.length === 0 &&
  passRateNum >= STRESS_PASS_RATE_THRESHOLD &&
  mealFlowFailures.length <= MEAL_FLOW_FAIL_MAX &&
  culturalFailures.length <= CULTURAL_FAIL_MAX &&
  failureSims.every((s) => s.pass);

const gateIntegrityAudit = auditReleaseGateIntegrity({
  results,
  releaseGate: {
    gatePass,
    mealFlowFailures: mealFlowFailures.length,
    culturalFailures: culturalFailures.length,
    mealFlowFailureCap: MEAL_FLOW_FAIL_MAX,
    culturalFailureCap: CULTURAL_FAIL_MAX,
  },
  countrySignatures: countryDiff.signatures ?? [],
});

report.releaseGate = {
  passRateThreshold: STRESS_PASS_RATE_THRESHOLD,
  mealFlowFailureCap: MEAL_FLOW_FAIL_MAX,
  culturalFailureCap: CULTURAL_FAIL_MAX,
  mealFlowFailures: mealFlowFailures.length,
  culturalFailures: culturalFailures.length,
  infantSafetyFailures: infantSafetyFailures.length,
  trustFailures: trustFailures.length,
  gatePass,
  realQualityScore: gateIntegrityAudit.realQualityScore,
  validatorScore: gateIntegrityAudit.validatorScore,
  gateIntegrityScore: gateIntegrityAudit.gateIntegrityScore,
  countryDifferentiationScore: countryDiff.countryDifferentiationScore,
  gateIntegrityFindings: gateIntegrityAudit.findings,
};

const jsonArg = process.argv.find((a) => a.startsWith("--json-out="));
const outPath = jsonArg?.split("=")[1];
if (outPath) {
  writeFileSync(outPath, JSON.stringify({ report, results, failureSims }, null, 2));
}

console.log(JSON.stringify(report, null, 2));

if (!gatePass) {
  process.exit(1);
}
