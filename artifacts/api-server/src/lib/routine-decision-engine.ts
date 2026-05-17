/**
 * Context-adaptive decision engine — transforms activity mix and structure
 * before timeline placement. Replaces rule-only scheduling with state-driven
 * orchestration.
 */
import type { WeatherOutdoor } from "@workspace/family-routine";
import {
  deriveBehavioralState,
  mealWindowsForState,
  type ChildProfileForRoutine,
  type InterpretedBehavioralState,
  type RoutineRawContext,
} from "./routine-context-engine.js";

export type { RoutineRawContext, InterpretedBehavioralState, ChildProfileForRoutine };
import { buildRoutineContext } from "./routine-context-builder.js";
import { runRoutineIntelligencePipeline } from "./routine-intelligence-pipeline.js";
import {
  classifyStructureBlock,
  isOutdoorBlockedByHeat,
  orderItemsByCountryStructure,
  type StructureBlockKind,
} from "./routine-country-structure.js";
import {
  allocatePrioritySlots,
  type DecisionTraceEntry,
  type RoutineScheduleItemWithDecision,
} from "./routine-priority-engine.js";
import { validateAqiOutdoorRules } from "./routine-aqi.js";
import {
  aqiOutdoorLimitNote,
  MIN_OUTDOOR_SPORT_MINS,
} from "./routine-health-copy.js";
import { polishRoutineOutput } from "./routine-output-polish.js";
import {
  applyWeatherFirstPlanning,
  enforceOutdoorTimeGuards,
  enforceSleepIsLast,
  repositionOutdoorSessions,
  weatherAdjustmentReason,
  WEATHER_ADJUSTMENT_LABEL,
} from "./routine-weather-planning.js";
import {
  applyMealAwareScheduling,
  enrichRoutineMeals,
  validateMealActivityIntegration,
} from "./routine-meal-integration.js";
import {
  buildPriorityTimeline,
  clampDurationForCategory,
  computeDayBounds,
  normalizeTo24h,
  parseTimeToMins,
  minsToTime24,
  resolveRoutineSchedule,
  slotsToRoutineItems,
  type ResolveResult,
  type RoutineScheduleItem,
  type ScheduleOpts,
} from "./routine-scheduler.js";

export type ScheduleDecisionMeta = {
  reason: string;
  source: "safety" | "health" | "development" | "preference" | "structure";
  originalActivity?: string;
};

export type { DecisionTraceEntry, RoutineScheduleItemWithDecision } from "./routine-priority-engine.js";
export { allocatePrioritySlots, injectCulturalBlocks } from "./routine-priority-engine.js";

const EXTRACURRICULAR_RE =
  /\b(soccer|football club|sports practice|music|club|tuition|hobby)\b/i;
const INDEPENDENCE_RE =
  /\b(get ready|self study|pack backpack|independently|selbstständig|on your own)\b/i;

const OUTDOOR_CATS = new Set(["outdoor", "outdoor_play"]);
const OUTDOOR_RE =
  /\b(outdoor|park|cycling|cycle ride|bike ride|walk|nature|garden|playground|swim|run|jog|football|cricket|tennis|skating|fresh air)\b/i;
const STUDY_CATS = new Set(["study", "school"]);
const PLAY_CATS = new Set(["play", "outdoor", "creative", "exercise", "activity"]);
const SNACK_RE = /\b(snack|tiffin|drunch|after-school snack)\b/i;

const INDOOR_HIGH_ENERGY: Array<{ activity: string; category: string; notes: string }> = [
  {
    activity: "Indoor Obstacle Course",
    category: "play",
    notes: "High-energy indoor option — pillows, tape lines, timed challenges.",
  },
  {
    activity: "Dance Party & Movement",
    category: "exercise",
    notes: "Rainy-day energy release — 2–3 upbeat songs with freeze-dance.",
  },
  {
    activity: "Living-Room Sports Circuit",
    category: "play",
    notes: "Soft ball targets and relay stations to channel active energy indoors.",
  },
];

const INDOOR_CALM: Array<{ activity: string; category: string; notes: string }> = [
  {
    activity: "Quiet Creative Play",
    category: "creative",
    notes: "Calm indoor option — drawing, puzzles, or building blocks.",
  },
];

function isOutdoorItem(item: RoutineScheduleItem): boolean {
  const cat = (item.category ?? "").toLowerCase();
  if (OUTDOOR_CATS.has(cat)) return true;
  return OUTDOOR_RE.test(item.activity);
}

/** Outdoor blocks plus sports/clubs that cannot run in rain/snow. */
function isWeatherSensitiveActivity(item: RoutineScheduleItem): boolean {
  if (isOutdoorItem(item)) return true;
  const cat = (item.category ?? "").toLowerCase();
  return cat === "exercise" && EXTRACURRICULAR_RE.test(item.activity);
}

function withDecision(
  item: RoutineScheduleItem,
  reason: string,
  source: ScheduleDecisionMeta["source"],
  originalActivity?: string,
  culturalTag?: string,
  structureKind?: StructureBlockKind,
): RoutineScheduleItemWithDecision {
  return {
    ...item,
    scheduleDecision: { reason, source, originalActivity },
    culturalTag,
    structureKind,
  };
}

function hasMatching(items: RoutineScheduleItem[], re: RegExp): boolean {
  return items.some((i) => re.test(i.activity));
}

function localizeActivityLabels(
  items: RoutineScheduleItemWithDecision[],
  state: InterpretedBehavioralState,
): RoutineScheduleItemWithDecision[] {
  const L = state.labels;
  return items.map((item) => {
    const act = item.activity;
    let next = { ...item };

    if (/\b(homework|study|learning block|tuition)\b/i.test(act) && !EXTRACURRICULAR_RE.test(act)) {
      next = withDecision(
        { ...next, activity: L.studyBlock },
        `${state.country} study label localization`,
        "preference",
        act,
        `study_${state.country.toLowerCase()}`,
        state.country === "IN" ? "study" : "study",
      );
    } else if (/\b(outdoor play|park play|backyard)\b/i.test(act) && state.allowOutdoor) {
      const kind =
        state.country === "AT"
          ? "outdoor_structured"
          : state.country === "AE"
            ? "outdoor_evening"
            : "outdoor";
      next = withDecision(
        { ...next, activity: L.outdoorPlay },
        `${state.country} outdoor label localization`,
        "preference",
        act,
        `outdoor_${state.country.toLowerCase()}`,
        kind,
      );
    } else if (
      /\b(indoor creative|creative play|indoor play)\b/i.test(act) &&
      !state.allowOutdoor
    ) {
      next = withDecision(
        { ...next, activity: state.preferIndoorCreative ? L.indoorCreative : act },
        `${state.country} indoor creative localization`,
        "preference",
        act,
        `indoor_creative_${state.country.toLowerCase()}`,
        "indoor_creative",
      );
    } else if (/\bfamily time\b/i.test(act)) {
      next = {
        ...next,
        activity: L.familyTime,
        culturalTag: `family_${state.country.toLowerCase()}`,
        structureKind: "family",
      };
    }

    return next;
  });
}

function pickIndoorHighEnergy(seed: number): (typeof INDOOR_HIGH_ENERGY)[number] {
  return INDOOR_HIGH_ENERGY[Math.abs(seed) % INDOOR_HIGH_ENERGY.length]!;
}

function transformActivitiesForState(
  items: RoutineScheduleItem[],
  state: InterpretedBehavioralState,
): RoutineScheduleItemWithDecision[] {
  const out: RoutineScheduleItemWithDecision[] = [];
  let seed = items.length;

  for (const item of items) {
    const cat = (item.category ?? "").toLowerCase();
    let next: RoutineScheduleItemWithDecision = {
      ...item,
      structureKind: classifyStructureBlock(item),
    };

    if (!state.allowOutdoor && isWeatherSensitiveActivity(item)) {
      const swap = state.preferIndoorHighEnergy
        ? pickIndoorHighEnergy(seed++)
        : state.preferIndoorCreative
          ? {
              activity: state.labels.indoorCreative,
              category: "creative",
              notes: "Rainy-day creative play — puzzles, drawing, or building.",
            }
          : INDOOR_CALM[0]!;
      const useCreative = state.preferIndoorCreative && !state.preferIndoorHighEnergy;
      next = withDecision(
        {
          ...item,
          activity: swap.activity,
          category: swap.category,
          notes: swap.notes,
          duration: clampDurationForCategory(
            swap.category,
            Math.round((item.duration ?? 30) * state.playDurationFactor),
          ),
          structureKind: useCreative ? "indoor_creative" : "indoor_rest",
        },
        state.preferIndoorHighEnergy
          ? weatherAdjustmentReason("indoor high-energy swap — outdoor blocked")
          : useCreative
            ? weatherAdjustmentReason(`${state.country} rainy pattern — indoor creative`)
            : weatherAdjustmentReason("moved indoors — outdoor not safe"),
        "safety",
        item.activity,
        useCreative
          ? `indoor_creative_${state.country.toLowerCase()}`
          : `indoor_swap_${state.country.toLowerCase()}`,
        useCreative ? "indoor_creative" : "indoor_rest",
      );
    } else if (STUDY_CATS.has(cat) && state.reduceStudyBlocks) {
      const dur = clampDurationForCategory(
        cat,
        Math.round((item.duration ?? 45) * state.studyDurationFactor),
      );
      if (dur < (item.duration ?? 45)) {
        next = withDecision(
          { ...item, duration: dur },
          "shortened study block for weekend mode",
          "preference",
        );
      }
    } else if (
      state.maxOutdoorDurationFromAqi != null &&
      state.maxOutdoorDurationFromAqi > 0 &&
      isOutdoorItem(item)
    ) {
      if (
        state.maxOutdoorDurationFromAqi < MIN_OUTDOOR_SPORT_MINS &&
        !state.aqiMetroAdvisoryMode
      ) {
        continue;
      }
      if ((item.duration ?? 30) > state.maxOutdoorDurationFromAqi) {
        const aqiNote =
          aqiOutdoorLimitNote(state.aqi, state.maxOutdoorDurationFromAqi) ??
          "Air quality is moderate — limit outdoor time";
        next = withDecision(
          {
            ...item,
            duration: state.maxOutdoorDurationFromAqi,
            notes: [item.notes, aqiNote].filter(Boolean).join(" "),
          },
          aqiNote,
          "safety",
          item.activity,
        );
      }
    } else if (
      state.allowOutdoor &&
      state.limitOutdoorShortenOnly &&
      !state.replaceOutdoorNotShorten &&
      !state.outdoorBlockedByAqi &&
      state.environmentConstraintLevel === "medium" &&
      isOutdoorItem(item) &&
      !state.preferSaferOutdoorActivity
    ) {
      const dur = clampDurationForCategory(
        cat,
        Math.max(15, Math.round((item.duration ?? 30) * 0.65)),
      );
      if (dur < (item.duration ?? 30)) {
        next = withDecision(
          {
            ...item,
            duration: dur,
            notes: [item.notes, "Shortened — cold/limited outdoor conditions."]
              .filter(Boolean)
              .join(" "),
          },
          weatherAdjustmentReason("shorter outdoor — cold day (still present)"),
          "safety",
          item.activity,
        );
      }
    } else if (
      state.allowOutdoor &&
      state.preferSaferOutdoorActivity &&
      isOutdoorItem(item) &&
      !/\bwind-safe|sheltered\b/i.test(item.activity)
    ) {
      next = withDecision(
        {
          ...item,
          duration: clampDurationForCategory(
            cat,
            Math.max(20, Math.round((item.duration ?? 30) * 0.7)),
          ),
          notes: [item.notes, "Wind-safe outdoor — reduced duration."].filter(Boolean).join(" "),
        },
        weatherAdjustmentReason("wind-safe outdoor — NZ windy day"),
        "safety",
        item.activity,
      );
    } else if (PLAY_CATS.has(cat) && state.activityBias === "play") {
      const dur = clampDurationForCategory(
        cat,
        Math.round((item.duration ?? 30) * state.playDurationFactor),
      );
      if (dur !== item.duration) {
        next = withDecision(
          { ...item, duration: dur },
          "extended play for high-energy / play-biased day",
          "preference",
        );
      }
    } else if (STUDY_CATS.has(cat) && state.activityBias === "cognitive") {
      next = withDecision(
        item,
        "cognitive bias — school-day learning priority",
        "development",
      );
    }

    out.push(next);
  }

  return out;
}

function filterReducedStudy(
  items: RoutineScheduleItemWithDecision[],
  state: InterpretedBehavioralState,
): RoutineScheduleItemWithDecision[] {
  if (!state.reduceStudyBlocks) return items;

  let keptStudy = false;
  return items.filter((i) => {
    if (i.structureKind === "study_optional") return true;
    if (!STUDY_CATS.has((i.category ?? "").toLowerCase())) return true;
    if (!keptStudy) {
      keptStudy = true;
      return true;
    }
    return false;
  });
}

/** Country template order; light diversify only within the same structure kind. */
function orderForCountryPlacement(
  items: RoutineScheduleItemWithDecision[],
  country: string,
): RoutineScheduleItemWithDecision[] {
  return orderItemsByCountryStructure(items, country) as RoutineScheduleItemWithDecision[];
}

export type GenerateRoutineResult = {
  items: RoutineScheduleItemWithDecision[];
  state: InterpretedBehavioralState;
  validationWarnings: string[];
  decisionTrace: DecisionTraceEntry[];
  confidence?: import("./routine-health-copy.js").RoutineConfidence;
};

/** Post-meal-flow weather pass — swaps outdoor/sports blocks added during placement. */
export function applyWeatherToScheduledItems(
  items: RoutineScheduleItem[],
  state: InterpretedBehavioralState,
  trace: DecisionTraceEntry[] = [],
): RoutineScheduleItem[] {
  let next = transformActivitiesForState(
    items.map((it) => ({ ...it })) as RoutineScheduleItemWithDecision[],
    state,
  );
  next = enforceOutdoorTimeGuards(next, state, trace) as RoutineScheduleItemWithDecision[];
  next = enforceSleepIsLast(next, trace) as RoutineScheduleItemWithDecision[];
  return polishRoutineOutput(next, state, trace) as RoutineScheduleItemWithDecision[];
}

export { WEATHER_ADJUSTMENT_LABEL, weatherAdjustmentReason };

/**
 * Pre-schedule reshaping only (weather, culture inject, labels) — no timeline placement.
 */
export function reshapeItemsForContext(
  input: RoutineScheduleItem[],
  interpretedContext: InterpretedBehavioralState,
  reshapeOpts?: { ageInMonths?: number; decisionTrace?: DecisionTraceEntry[] },
): RoutineScheduleItemWithDecision[] {
  const skipCulture =
    reshapeOpts?.ageInMonths != null && reshapeOpts.ageInMonths < 6;
  const trace = reshapeOpts?.decisionTrace ?? [];

  let transformed = localizeActivityLabels(
    input.map((it) => ({ ...it })) as RoutineScheduleItemWithDecision[],
    interpretedContext,
  );

  transformed = applyWeatherFirstPlanning(transformed, interpretedContext, trace);

  if (!skipCulture) {
    transformed = allocatePrioritySlots(transformed, interpretedContext, trace);
    transformed = repositionOutdoorSessions(transformed, interpretedContext);
    transformed = filterReducedStudy(transformed, interpretedContext);
  }

  transformed = transformActivitiesForState(transformed, interpretedContext);
  transformed = polishRoutineOutput(
    transformed,
    interpretedContext,
    trace,
  ) as RoutineScheduleItemWithDecision[];
  for (const it of transformed) {
    if (
      it.scheduleDecision?.reason?.includes(WEATHER_ADJUSTMENT_LABEL) ||
      (it.scheduleDecision?.originalActivity &&
        it.scheduleDecision.originalActivity !== it.activity)
    ) {
      trace.push({
        kind: "weather",
        message: it.scheduleDecision.reason,
        detail: { from: it.scheduleDecision.originalActivity, to: it.activity },
      });
    }
  }
  return transformed;
}

/**
 * Context-driven orchestration: reshape activities, then place on timeline.
 */
export function generateRoutineFromState(
  input: RoutineScheduleItem[],
  interpretedContext: InterpretedBehavioralState,
  opts: ScheduleOpts,
): GenerateRoutineResult {
  const validationWarnings: string[] = [];
  const decisionTrace: DecisionTraceEntry[] = [];

  if (!input.length || opts.ageGroup === "infant") {
    return {
      items: input.map((it) => ({
        ...it,
        time: normalizeTo24h(it.time),
      })),
      state: interpretedContext,
      validationWarnings,
      decisionTrace,
    };
  }

  const transformed = reshapeItemsForContext(input, interpretedContext, { decisionTrace });
  const ordered = orderForCountryPlacement(transformed, interpretedContext.country);

  const bounds = computeDayBounds(opts.wakeUpTime, opts.sleepTime);
  const mealWindows = mealWindowsForState(interpretedContext);

  let slots = buildPriorityTimeline(ordered, bounds, {
    ...opts,
    mealWindows,
    country: interpretedContext.country,
  });

  let placed = slotsToRoutineItems(slots);
  let items: RoutineScheduleItemWithDecision[] = placed.map((s) => {
    const match = transformed.find(
      (t) =>
        t.activity === s.activity ||
        s.activity.includes(t.activity.replace(/\s*\(.*\)$/, "")) ||
        t.scheduleDecision?.originalActivity === s.activity,
    );
    return {
      ...s,
      scheduleDecision: match?.scheduleDecision,
      culturalTag: match?.culturalTag ?? s.culturalTag,
      structureKind: match?.structureKind,
    };
  });

  const wakeMins = parseTimeToMins(normalizeTo24h(opts.wakeUpTime));
  const sleepMins = parseTimeToMins(normalizeTo24h(opts.sleepTime));

  const mealFlow = applyMealAwareScheduling(items, interpretedContext, {
    hasSchool: opts.hasSchool,
    schoolEndMins: opts.schoolEndMins,
    schoolStartMins: opts.schoolStartMins,
    sleepMins,
    wakeMins,
    ageInMonths: opts.ageInMonths,
    feedingType: opts.feedingType,
  });
  items = mealFlow.items as RoutineScheduleItemWithDecision[];
  validationWarnings.push(...mealFlow.adjustments);

  items = enrichRoutineMeals(items, {
    country: interpretedContext.country,
    seed: interpretedContext.countryProfile.country.charCodeAt(0) * 31,
    ageInMonths: opts.ageInMonths,
    feedingType: opts.feedingType,
  }) as RoutineScheduleItemWithDecision[];

  const resolved = resolveRoutineSchedule(items, {
    ...opts,
    mealWindows,
    country: interpretedContext.country,
  });
  items = resolved.items as RoutineScheduleItemWithDecision[];

  items = applyWeatherToScheduledItems(items, interpretedContext, decisionTrace);
  items = enforceSleepIsLast(items, decisionTrace) as RoutineScheduleItemWithDecision[];

  const alignment = validateAgainstInterpretedState(items, interpretedContext);
  const cultural = validateAgainstCountryProfile(items, interpretedContext);
  const ordering = validateActivityOrdering(items, interpretedContext);
  const mealIntegration = validateMealActivityIntegration(items, interpretedContext.country, {
    hasSchool: opts.hasSchool,
    schoolEndMins: opts.schoolEndMins,
    ageInMonths: opts.ageInMonths,
    feedingType: opts.feedingType,
    sleepMins,
  });
  validationWarnings.push(...alignment, ...cultural, ...ordering, ...mealIntegration);
  validationWarnings.push(
    ...validateAqiOutdoorRules(items, interpretedContext.aqi, interpretedContext.country),
  );

  return { items, state: interpretedContext, validationWarnings, decisionTrace };
}

/** Build interpreted state from raw context when callers only have primitives. */
export function generateRoutineWithContext(
  input: RoutineScheduleItem[],
  rawContext: RoutineRawContext,
  childProfile: ChildProfileForRoutine,
  opts: ScheduleOpts,
): GenerateRoutineResult {
  const built = buildRoutineContext({
    weatherOutdoor: rawContext.weatherOutdoor,
    country: rawContext.country,
    region: rawContext.region,
    isWeekendDay: rawContext.isWeekendDay,
    hasSchool: rawContext.hasSchool,
    mood: rawContext.mood,
    previousDayContext: rawContext.previousDayContext,
    environmentalRiskScore: rawContext.environmentalRiskScore,
    outdoorSuitability: rawContext.outdoorSuitability,
    temperatureC: rawContext.temperatureC,
    hydrationNeedLevel: rawContext.hydrationNeedLevel,
    sensoryStressLevel: rawContext.sensoryStressLevel,
    cognitiveComfortLevel: rawContext.cognitiveComfortLevel,
  });
  const state = deriveBehavioralState(built, childProfile);
  return generateRoutineFromState(input, state, opts);
}

/**
 * Ensures schedule output does not contradict behavioral state.
 */
export function validateAgainstInterpretedState(
  items: RoutineScheduleItem[],
  state: InterpretedBehavioralState,
): string[] {
  const warnings: string[] = [];

  if (!state.allowOutdoor) {
    for (const it of items) {
      if (isWeatherSensitiveActivity(it)) {
        warnings.push(
          `contradiction: outdoor "${it.activity}" present when state disallows outdoor`,
        );
      }
    }
  }

  if (state.dayType === "indoor-heavy") {
    const outdoorCount = items.filter(isWeatherSensitiveActivity).length;
    if (outdoorCount > 0) {
      warnings.push(`contradiction: ${outdoorCount} outdoor items on indoor-heavy day`);
    }
  }

  if (state.reduceStudyBlocks) {
    const studyCount = items.filter((i) =>
      STUDY_CATS.has((i.category ?? "").toLowerCase()),
    ).length;
    if (studyCount > 2) {
      warnings.push(
        `contradiction: ${studyCount} study blocks exceed weekend reduction target`,
      );
    }
  }

  return warnings;
}

/** Sports/extracurricular must end before dinner; dinner precedes wind-down. */
export function validateActivityOrdering(
  items: RoutineScheduleItem[],
  state: InterpretedBehavioralState,
): string[] {
  const warnings: string[] = [];
  const dinner = items.find((i) => /\bdinner\b/i.test(i.activity));
  if (!dinner) return warnings;

  const dinnerStart = parseTimeToMins(dinner.time);
  const preDinnerActive = new Set(["US", "UK", "AU", "NZ"]);

  if (preDinnerActive.has(state.country)) {
    for (const it of items) {
      if (!EXTRACURRICULAR_RE.test(it.activity) && !isOutdoorItem(it)) continue;
      const end = parseTimeToMins(it.time) + (it.duration ?? 30);
      if (end > dinnerStart + 5) {
        warnings.push(
          `ordering: "${it.activity}" should finish before dinner (${dinner.time})`,
        );
      }
    }
  }

  if (state.country === "AE") {
    for (const it of items) {
      if (!isOutdoorItem(it)) continue;
      const start = parseTimeToMins(it.time);
      if (isOutdoorBlockedByHeat(start, "AE")) {
        warnings.push(
          `ordering: UAE outdoor "${it.activity}" before 18:30 (hard heat constraint)`,
        );
      }
    }
  }

  return warnings;
}

/**
 * Validates routine against country parenting norms.
 */
export function validateAgainstCountryProfile(
  items: RoutineScheduleItem[],
  state: InterpretedBehavioralState,
): string[] {
  const warnings: string[] = [];
  const profile = state.countryProfile;
  const [, sleepEnd] = profile.sleepWindow;

  const playAfterSleep = items.filter((it) => {
    if (!PLAY_CATS.has((it.category ?? "").toLowerCase()) && !isOutdoorItem(it)) {
      return false;
    }
    const start = parseTimeToMins(it.time);
    return start >= sleepEnd - 60;
  });
  if (playAfterSleep.length > 0 && (profile.country === "US" || profile.country === "UK")) {
    warnings.push(
      `cultural: late-evening play unusual for ${profile.country} (before ${minsToTime24(sleepEnd)})`,
    );
  }

  if (state.requireExtracurricularBlock && !hasMatching(items, EXTRACURRICULAR_RE)) {
    warnings.push(
      `cultural: missing expected extracurricular block for ${profile.country}`,
    );
  }

  if (state.requireOutdoorBlock && state.allowOutdoor) {
    const outdoor = items.filter((i) => isOutdoorItem(i) || i.category === "outdoor");
    if (outdoor.length === 0) {
      warnings.push(
        `cultural: no outdoor block despite ${profile.country} outdoor preference`,
      );
    }
  }

  const studyCount = items.filter((i) =>
    STUDY_CATS.has((i.category ?? "").toLowerCase()),
  ).length;
  if (studyCount < state.minStudyBlocks && profile.academicIntensity === "high") {
    warnings.push(
      `cultural: only ${studyCount} study blocks; ${profile.country} expects at least ${state.minStudyBlocks}`,
    );
  }

  const hasCulturalBlock = items.some(
    (i) =>
      i.culturalTag != null ||
      EXTRACURRICULAR_RE.test(i.activity) ||
      (state.allowOutdoor && isOutdoorItem(i)) ||
      hasMatching([i], INDEPENDENCE_RE),
  );
  if (!hasCulturalBlock) {
    warnings.push(`cultural: no culturally tagged or expected block in routine`);
  }

  return warnings;
}

/** Convenience: raw context → behavioral state → schedule. */
export function interpretAndSchedule(
  input: RoutineScheduleItem[],
  rawContext: RoutineRawContext,
  childProfile: ChildProfileForRoutine,
  opts: ScheduleOpts,
): RoutineScheduleItemWithDecision[] {
  return generateRoutineWithContext(input, rawContext, childProfile, opts).items;
}

/**
 * Full adaptive resolve: interpret context → reshape → place → validate/recover.
 */
export function resolveAdaptiveRoutineSchedule(
  items: RoutineScheduleItem[],
  rawContext: RoutineRawContext,
  childProfile: ChildProfileForRoutine,
  opts: ScheduleOpts,
): ResolveResult & { state: InterpretedBehavioralState; validationWarnings: string[] } {
  const built = buildRoutineContext({
    weatherOutdoor: rawContext.weatherOutdoor,
    country: rawContext.country,
    region: rawContext.region,
    isWeekendDay: rawContext.isWeekendDay,
    hasSchool: rawContext.hasSchool,
    mood: rawContext.mood,
    previousDayContext: rawContext.previousDayContext,
    environmentalRiskScore: rawContext.environmentalRiskScore,
    outdoorSuitability: rawContext.outdoorSuitability,
    temperatureC: rawContext.temperatureC,
    hydrationNeedLevel: rawContext.hydrationNeedLevel,
    sensoryStressLevel: rawContext.sensoryStressLevel,
    cognitiveComfortLevel: rawContext.cognitiveComfortLevel,
  });
  const result = runRoutineIntelligencePipeline({
    items,
    scheduleOpts: opts,
    builtContext: built,
    childProfile,
  });
  return {
    valid: result.validated,
    items: result.items,
    errors: result.validationErrors,
    usedFallback: result.reverted,
    state: result.state,
    validationWarnings: result.validationErrors,
  };
}

export function rawContextFromScheduleInput(input: {
  weatherOutdoor?: WeatherOutdoor;
  country?: string | null;
  region?: string;
  isWeekendDay?: boolean;
  hasSchool?: boolean;
  mood?: string;
  previousDayContext?: RoutineRawContext["previousDayContext"];
  environmentalRiskScore?: number;
  outdoorSuitability?: RoutineRawContext["outdoorSuitability"];
  temperatureC?: number | null;
  hydrationNeedLevel?: RoutineRawContext["hydrationNeedLevel"];
  sensoryStressLevel?: RoutineRawContext["sensoryStressLevel"];
  cognitiveComfortLevel?: RoutineRawContext["cognitiveComfortLevel"];
}): RoutineRawContext {
  return buildRoutineContext({
    weatherOutdoor: input.weatherOutdoor,
    country: input.country,
    region: input.region,
    isWeekendDay: input.isWeekendDay,
    hasSchool: input.hasSchool,
    mood: input.mood,
    previousDayContext: input.previousDayContext,
    environmentalRiskScore: input.environmentalRiskScore,
    outdoorSuitability: input.outdoorSuitability,
    temperatureC: input.temperatureC,
    hydrationNeedLevel: input.hydrationNeedLevel,
    sensoryStressLevel: input.sensoryStressLevel,
    cognitiveComfortLevel: input.cognitiveComfortLevel,
  });
}

export {
  differenceScore,
  routineStructureDifferenceScore,
  STRUCTURE_DIFFERENCE_THRESHOLD,
} from "./routine-country-structure.js";
