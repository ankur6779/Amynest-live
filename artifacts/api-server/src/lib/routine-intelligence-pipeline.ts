/**
 * Safe intelligence pipeline — behavior, difficulty, culture, explainability.
 * Core scheduling: scheduleRoutineItems + validateRoutineSchedule (final).
 */
import { buildRoutineContext, type BuiltRoutineContext } from "./routine-context-builder.js";
import {
  deriveBehavioralState,
  mealWindowsForState,
  type ChildProfileForRoutine,
  type InterpretedBehavioralState,
} from "./routine-context-engine.js";
import {
  applyBehaviorSignatureToItems,
  deriveChildBehaviorSignature,
  type ChildBehaviorSignature,
  type RoutineActivityHistory,
} from "./routine-behavior-signature.js";
import {
  adjustActivityDifficulty,
  snapshotDurations,
  totalDurationDriftPct,
  type DifficultyAdjustment,
} from "./routine-adaptive-difficulty.js";
import { applyCulturalModeling, type CulturalModelingChange } from "./routine-cultural-modeling.js";
import { attachExplainabilityMetadata } from "./routine-explainability.js";
import {
  applyWeatherToScheduledItems,
  reshapeItemsForContext,
  validateActivityOrdering,
  type DecisionTraceEntry,
} from "./routine-decision-engine.js";
import { enforceUaeOutdoorHardConstraint } from "./routine-priority-engine.js";
import { validateAqiOutdoorRules } from "./routine-aqi.js";
import { deriveRoutineConfidence, type RoutineConfidence } from "./routine-health-copy.js";
import { polishRoutineOutput } from "./routine-output-polish.js";
import { enforceSleepIsLast } from "./routine-weather-planning.js";
import { applyRoutineRealismPolish } from "./routine-realism-polish.js";
import { enforceEnergyCurve } from "./routine-category-taxonomy.js";
import { enforceFinalTimelineIntegrity } from "./routine-final-integrity.js";
import { runTieredValidation } from "./routine-validation-tiers.js";
import { finalizeMealStructure } from "./routine-meal-day-type.js";
import { resolveIsSchoolDay } from "./routine-meal-day-type.js";
import {
  applyMealAwareScheduling,
  enrichRoutineMeals,
  validateMealActivityIntegration,
} from "./routine-meal-integration.js";
import {
  getAgeGroup,
  isExclusiveInfantPhase,
  shouldSkipCountryCulture,
  validateAgeFeedingIntegration,
} from "./routine-age-feeding.js";
import {
  generateValidatedInfantRoutine,
  type InfantFeedingMode,
} from "./infant-adaptive-routine.js";
import { getRoutineOutcomeStore } from "./routine-outcome-log.js";
import {
  ensureFixedActivitiesPreserved,
  detectSpecialFixedConflicts,
  finalizeFixedActivitiesSummary,
  mergeTimelineShifts,
  shiftMealsAroundFixedBlocks,
  injectFixedActivityBlocks,
  parseFixedActivitiesForDate,
  removeSimilarDynamicBlocks,
  validateFixedActivitiesPlacement,
  type FixedActivitiesDebug,
  type FixedActivityInput,
} from "./routine-fixed-activities.js";
import {
  ensureSpecialEventsPreserved,
  injectSpecialEventBlocks,
  parseSpecialPlans,
  shiftNonLockedAroundLockedEvents,
  validateSpecialEventsPlacement,
  type ParsedSpecialEvent,
  type SpecialEventDebug,
} from "./routine-special-event.js";
import { resolveRoutineSchedule } from "./routine-scheduler.js";
import {
  hardValidateSchedule,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
  resolveTimelineOverlaps,
  scheduleRoutineItems,
  validateRoutineSchedule,
  type RoutineScheduleItem,
  type ScheduleOpts,
} from "./routine-scheduler.js";

export type IntelligencePipelineInput = {
  items: RoutineScheduleItem[];
  scheduleOpts: ScheduleOpts;
  builtContext: BuiltRoutineContext;
  childProfile: ChildProfileForRoutine;
  behaviorHistory?: RoutineActivityHistory;
  childId?: string;
  debug?: boolean;
  /** Comma-separated fridge list — blended with country dishes (max ~50%). */
  fridgeItems?: string;
  isVeg?: boolean;
  /** Deterministic seed for meal rotation. */
  mealSeed?: number;
  /** Child age in months (overrides profile when set). */
  ageInMonths?: number;
  feedingType?: "breastfeeding" | "formula" | "mixed";
  /** Parent special plans — string, pipe-separated, or array of event lines. */
  specialPlans?: string | string[];
  /** Recurring fixed activities (tuition, sports, classes). */
  fixedActivities?: FixedActivityInput[];
  /** Routine date (YYYY-MM-DD) — filters fixedActivities by weekday. */
  routineDate?: string;
};

export type IntelligencePipelineResult = {
  items: RoutineScheduleItem[];
  validated: boolean;
  reverted: boolean;
  behaviorSignature: ChildBehaviorSignature;
  state: InterpretedBehavioralState;
  difficultyAdjustments: DifficultyAdjustment[];
  culturalChanges: CulturalModelingChange[];
  debugLog: string[];
  validationErrors: string[];
  decisionTrace: DecisionTraceEntry[];
  /** Trust signal when weather and AQI signals conflict. */
  confidence: RoutineConfidence;
  specialEvent: SpecialEventDebug;
  parsedSpecialEvent: ParsedSpecialEvent | null;
  parsedSpecialEvents: ParsedSpecialEvent[];
  fixedActivities: FixedActivitiesDebug;
  parsedFixedActivities: ReturnType<typeof parseFixedActivitiesForDate>["activities"];
};

function pipelineDebug(enabled: boolean | undefined, log: string[], msg: string, data?: unknown): void {
  if (!enabled && process.env.ROUTINE_SCHEDULER_DEBUG !== "1") return;
  log.push(msg);
  if (data !== undefined && (enabled || process.env.ROUTINE_SCHEDULER_DEBUG === "1")) {
    console.log(`[routine-intelligence] ${msg}`, data);
  }
}

function cloneItems(items: RoutineScheduleItem[]): RoutineScheduleItem[] {
  return items.map((i) => ({ ...i }));
}

function isAdaptiveInfantDay(ageInMonths?: number): boolean {
  return ageInMonths != null && ageInMonths >= 6 && ageInMonths < 12;
}

function mapInfantFeedingMode(
  feedingType?: string | null,
): InfantFeedingMode {
  const s = (feedingType ?? "").toLowerCase();
  if (s.includes("breast") && s.includes("formula")) return "mixed";
  if (s.includes("breast")) return "breast";
  if (s.includes("formula")) return "formula";
  if (s.includes("solid")) return "solids_intro";
  return "mixed";
}

export function buildHistoryFromOutcomeStore(
  childId: string | undefined,
  previousDayContext?: RoutineActivityHistory["previousDayContext"],
): RoutineActivityHistory {
  const entries =
    childId != null
      ? getRoutineOutcomeStore()
          .list({ childId })
          .slice(-40)
          .map((r) => ({
            activity: r.activity,
            category: r.category,
            completed: r.completed,
            skipped: r.skipped,
          }))
      : [];
  return { entries, previousDayContext };
}

/**
 * Final intelligence pass after meals/weather/energy enrichment.
 * Order: signature → context → schedule → difficulty → culture → explain → validate.
 */
export function runRoutineIntelligencePipeline(
  input: IntelligencePipelineInput,
): IntelligencePipelineResult {
  const debugLog: string[] = [];
  const decisionTrace: DecisionTraceEntry[] = [];
  const { scheduleOpts, builtContext, childProfile, debug } = input;

  const history =
    input.behaviorHistory ??
    buildHistoryFromOutcomeStore(input.childId, builtContext.previousDayContext);

  const behaviorSignature = deriveChildBehaviorSignature(childProfile, history);
  pipelineDebug(debug, debugLog, "behaviorSignature", behaviorSignature);

  const state = deriveBehavioralState(builtContext, childProfile);
  pipelineDebug(debug, debugLog, "interpretedState", {
    country: state.country,
    dayType: state.dayType,
    activityBias: state.activityBias,
  });

  const ageInMonthsEarly =
    input.ageInMonths ?? childProfile.ageInMonths;

  const wakeMinsEarly = parseTimeToMins(normalizeTo24h(scheduleOpts.wakeUpTime));
  const sleepMinsEarly = parseTimeToMins(normalizeTo24h(scheduleOpts.sleepTime));
  const specialParse = parseSpecialPlans(input.specialPlans, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
  });

  const routineDate =
    input.routineDate ??
    builtContext.referenceDate?.toISOString().slice(0, 10) ??
    new Date().toISOString().slice(0, 10);
  const fixedParse = parseFixedActivitiesForDate(input.fixedActivities, routineDate);

  if (isExclusiveInfantPhase(ageInMonthsEarly)) {
    const wake = normalizeTo24h(scheduleOpts.wakeUpTime);
    const sleep = normalizeTo24h(scheduleOpts.sleepTime);
    const wakeMins = parseTimeToMins(wake);
    const sleepMins = parseTimeToMins(sleep);
    const feedingType = input.feedingType ?? childProfile.feedingType;
    const flowOpts = {
      hasSchool: false,
      sleepMins,
      wakeMins,
      ageInMonths: ageInMonthsEarly,
      feedingType,
      feedingAgeGroup: "infant_0_6" as const,
    };
    const mealFlow = applyMealAwareScheduling([], state, flowOpts);
    const mealSeed =
      input.mealSeed ??
      (input.childId?.length ?? 0) + state.country.charCodeAt(0) * 17;
    let infantItems = enrichRoutineMeals(mealFlow.items, {
      country: state.country,
      ageInMonths: ageInMonthsEarly,
      feedingType,
      seed: mealSeed,
      feedingAgeGroup: "infant_0_6",
    });
    infantItems = attachExplainabilityMetadata(infantItems, {
      signature: behaviorSignature,
      state,
      difficultyAdjustments: [],
      culturalChanges: [],
    });
    const hard = hardValidateSchedule(infantItems, wake, sleep);
    const ageWarnings = validateAgeFeedingIntegration(infantItems, "infant_0_6");
    pipelineDebug(debug, debugLog, "infant_0_6_exclusive_path", {
      hardValid: hard.valid,
      ageWarnings,
    });
    return {
      items: infantItems,
      validated: hard.valid && ageWarnings.length === 0,
      reverted: false,
      behaviorSignature,
      state,
      difficultyAdjustments: [],
      culturalChanges: [],
      debugLog: [...debugLog, "infant_0_6_exclusive_path"],
      validationErrors: [...hard.errors, ...ageWarnings],
      decisionTrace,
      confidence: "high",
      specialEvent: specialParse.debug,
      parsedSpecialEvent: specialParse.event,
      parsedSpecialEvents: specialParse.events,
      fixedActivities: fixedParse.debug,
      parsedFixedActivities: fixedParse.activities,
    };
  }

  if (isAdaptiveInfantDay(ageInMonthsEarly)) {
    const wake = normalizeTo24h(scheduleOpts.wakeUpTime);
    const sleep = normalizeTo24h(scheduleOpts.sleepTime);
    const previousDay =
      builtContext.previousDayContext ?? history.previousDayContext;
    const constraints: string[] = [];
    if (previousDay?.sleepQuality === "poor") {
      constraints.push("poor sleep previous night");
    }
    const specialEvents = specialParse.events.map((e) => ({
      label: e.activity,
      time: minsToTime24(e.startMins),
    }));
    const validated = generateValidatedInfantRoutine({
      ageMonths: ageInMonthsEarly,
      wakeTime: wake,
      sleepTime: sleep,
      feedingType: mapInfantFeedingMode(
        input.feedingType ?? childProfile.feedingType,
      ),
      aqi: builtContext.aqi ?? null,
      weather: builtContext.environment?.condition ?? undefined,
      location: builtContext.region ?? state.country,
      specialEvents: specialEvents.length > 0 ? specialEvents : undefined,
      constraints: constraints.length > 0 ? constraints : undefined,
      nightWakings:
        previousDay?.sleepQuality === "poor"
          ? { count: 2, severity: "moderate" }
          : undefined,
    });
    const infantItems = validated.result.items;
    const hard = hardValidateSchedule(infantItems, wake, sleep);
    const auditPassed = validated.finalAudit.allPassed;
    pipelineDebug(debug, debugLog, "infant_adaptive_validated_path", {
      realismScore: validated.realismScore.total,
      blocks: validated.result.blocks.length,
      auditPassed,
      schedulerValid: hard.valid,
    });
    return {
      items: infantItems,
      validated: auditPassed,
      reverted: false,
      behaviorSignature,
      state,
      difficultyAdjustments: [],
      culturalChanges: [],
      debugLog: [...debugLog, "infant_adaptive_validated_path"],
      validationErrors: auditPassed
        ? hard.valid
          ? []
          : hard.errors
        : validated.finalAudit.results
            .filter((r) => r.status === "FAIL")
            .flatMap((r) => r.details),
      decisionTrace,
      confidence: auditPassed ? "high" : "medium",
      specialEvent: specialParse.debug,
      parsedSpecialEvent: specialParse.event,
      parsedSpecialEvents: specialParse.events,
      fixedActivities: fixedParse.debug,
      parsedFixedActivities: fixedParse.activities,
    };
  }

  let items = cloneItems(input.items).map((it) => ({
    ...it,
    time: normalizeTo24h(it.time),
  }));

  if (specialParse.events.length > 0) {
    items = injectSpecialEventBlocks(items, specialParse.events, {
      wakeMins: wakeMinsEarly,
      sleepMins: sleepMinsEarly,
    });
    pipelineDebug(debug, debugLog, "specialEventsInjected", specialParse.events);
    for (const ev of specialParse.events) {
      decisionTrace.push({
        kind: "priority",
        message: `Special event locked: ${ev.activity} @ ${minsToTime24(ev.startMins)}`,
        detail: { type: ev.type, source: ev.timeSource },
      });
    }
  }

  if (fixedParse.activities.length > 0) {
    items = injectFixedActivityBlocks(items, fixedParse.activities);
    pipelineDebug(debug, debugLog, "fixedActivitiesInjected", fixedParse.activities);
    for (const f of fixedParse.activities) {
      decisionTrace.push({
        kind: "priority",
        message: `Fixed activity locked: ${f.activity} @ ${minsToTime24(f.startMins)}–${minsToTime24(f.endMins)}`,
        detail: { days: f.days, source: "fixed" },
      });
    }
  }

  const preEnhancementSnapshot = cloneItems(items);
  const baselineDurations = snapshotDurations(items);

  items = applyBehaviorSignatureToItems(items, behaviorSignature);
  pipelineDebug(debug, debugLog, "applied behavior signature (durations/order)");

  items = reshapeItemsForContext(items, state, {
    ageInMonths: ageInMonthsEarly,
    decisionTrace,
  });
  pipelineDebug(debug, debugLog, "reshaped for weather + priority slots (pre-schedule)");

  if (fixedParse.activities.length > 0) {
    const stripped = removeSimilarDynamicBlocks(items, fixedParse.activities);
    items = stripped.items;
    if (stripped.removed.length) {
      fixedParse.debug.adjustmentsMade.push(
        `Removed similar AI blocks: ${stripped.removed.join(", ")}`,
      );
      pipelineDebug(debug, debugLog, "removedSimilarToFixed", stripped.removed);
    }
    items = injectFixedActivityBlocks(items, fixedParse.activities);
  }

  items = scheduleRoutineItems(items, {
    ...scheduleOpts,
    mealWindows: mealWindowsForState(state),
    country: state.country,
  });
  pipelineDebug(debug, debugLog, "scheduleRoutineItems complete");

  const wakeMins = parseTimeToMins(normalizeTo24h(scheduleOpts.wakeUpTime));
  const sleepMins = parseTimeToMins(normalizeTo24h(scheduleOpts.sleepTime));
  const ageInMonths =
    input.ageInMonths ?? childProfile.ageInMonths;
  const flowOpts = {
    hasSchool:
      (scheduleOpts.hasSchool ?? false) &&
      (ageInMonths == null || ageInMonths >= 36),
    isWeekendDay: builtContext.isWeekendDay,
    referenceDate: builtContext.referenceDate,
    schoolEndMins: scheduleOpts.schoolEndMins,
    schoolStartMins: scheduleOpts.schoolStartMins,
    sleepMins,
    wakeMins,
    ageInMonths,
    feedingType: input.feedingType ?? childProfile.feedingType,
    feedingAgeGroup:
      ageInMonths != null ? getAgeGroup(ageInMonths) : undefined,
  };

  const postScheduleSnapshot = cloneItems(items);

  const { items: difficultyItems, adjustments: difficultyAdjustments } =
    adjustActivityDifficulty(items, history, { baselineDurations });
  items = difficultyItems;
  pipelineDebug(debug, debugLog, "difficultyAdjustments", difficultyAdjustments);

  const drift = totalDurationDriftPct(baselineDurations, items);
  if (drift > 0.2) {
    pipelineDebug(debug, debugLog, `duration drift ${(drift * 100).toFixed(0)}% — reverting difficulty`);
    items = cloneItems(postScheduleSnapshot);
    difficultyAdjustments.length = 0;
  }

  const { items: culturalItems, changes: culturalChanges } = applyCulturalModeling(
    items,
    state,
    { ageInMonths: ageInMonthsEarly },
  );
  items = culturalItems;
  pipelineDebug(debug, debugLog, "culturalModeling", culturalChanges);

  items = attachExplainabilityMetadata(items, {
    signature: behaviorSignature,
    state,
    difficultyAdjustments,
    culturalChanges,
  });

  const wake = normalizeTo24h(scheduleOpts.wakeUpTime);
  const sleep = normalizeTo24h(scheduleOpts.sleepTime);

  if (!shouldSkipCountryCulture(ageInMonths)) {
    const resolved = resolveRoutineSchedule(items, {
      ...scheduleOpts,
      wakeUpTime: wake,
      sleepTime: sleep,
      mealWindows: mealWindowsForState(state),
      country: state.country,
    });
    items = resolved.items;
  }

  const mealFlow = applyMealAwareScheduling(items, state, flowOpts);
  items = mealFlow.items;
  if (mealFlow.adjustments.length) {
    pipelineDebug(debug, debugLog, "mealAwareScheduling (post-resolve)", mealFlow.adjustments);
  }

  const postMealShift = shiftNonLockedAroundLockedEvents(items);
  items = postMealShift.items;
  mergeTimelineShifts(fixedParse.debug, postMealShift.shiftsApplied);
  items = ensureSpecialEventsPreserved(items, specialParse.events, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
  });
  items = ensureFixedActivitiesPreserved(items, fixedParse.activities, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
  }, fixedParse.debug);
  pipelineDebug(debug, debugLog, "specialEventPreserved", specialParse.event?.activity ?? null);
  pipelineDebug(debug, debugLog, "fixedActivitiesPreserved", fixedParse.debug.activitiesForToday);

  items = applyWeatherToScheduledItems(items, state, decisionTrace);
  if (state.country === "AE") {
    items = enforceUaeOutdoorHardConstraint(items, decisionTrace);
  }
  items = enforceSleepIsLast(items, decisionTrace);
  pipelineDebug(debug, debugLog, "post-meal weather pass + UAE outdoor hard constraint");

  const mealSeed =
    input.mealSeed ??
    (input.childId?.length ?? 0) + state.country.charCodeAt(0) * 17;
  items = enrichRoutineMeals(items, {
    country: state.country,
    fridgeItems: input.fridgeItems,
    isVeg: input.isVeg ?? true,
    seed: mealSeed,
    ageInMonths,
    feedingType: flowOpts.feedingType,
  });
  pipelineDebug(debug, debugLog, "enriched country meals with dishes + energyImpact");

  const softWarnings = [
    ...validateMealActivityIntegration(items, state.country, flowOpts),
    ...validateActivityOrdering(items, state),
    ...validateAqiOutdoorRules(items, state.aqi, state.country),
  ];

  let tiered = runTieredValidation(items, wake, sleep, {
    ...scheduleOpts,
    country: state.country,
    skipMealReanchor: true,
  }, state, softWarnings);
  items = tiered.items;
  decisionTrace.push(...tiered.trace);
  let validated = { valid: tiered.hardValid, items, errors: [...tiered.structuralFixes, ...tiered.softWarnings] };
  let reverted = false;

  if (tiered.rejected) {
    pipelineDebug(debug, debugLog, "validation failed — reverting to pre-enhancement schedule", {
      errors: validated.errors,
    });
    let fallback = scheduleRoutineItems(
      reshapeItemsForContext(
        applyBehaviorSignatureToItems(preEnhancementSnapshot, behaviorSignature),
        state,
        { ageInMonths: ageInMonthsEarly, decisionTrace },
      ),
      { ...scheduleOpts, mealWindows: mealWindowsForState(state), country: state.country },
    );
    const mealFallback = applyMealAwareScheduling(fallback, state, flowOpts);
    fallback = mealFallback.items;
    fallback = ensureSpecialEventsPreserved(fallback, specialParse.events, {
      wakeMins: wakeMinsEarly,
      sleepMins: sleepMinsEarly,
    });
    fallback = ensureFixedActivitiesPreserved(fallback, fixedParse.activities, {
      wakeMins: wakeMinsEarly,
      sleepMins: sleepMinsEarly,
    }, fixedParse.debug);
    fallback = enrichRoutineMeals(fallback, {
      country: state.country,
      fridgeItems: input.fridgeItems,
      isVeg: input.isVeg ?? true,
      seed: mealSeed,
      ageInMonths,
      feedingType: flowOpts.feedingType,
    });
    tiered = runTieredValidation(
      fallback,
      wake,
      sleep,
      { ...scheduleOpts, country: state.country, skipMealReanchor: true },
      state,
      softWarnings,
    );
    fallback = tiered.items;
    decisionTrace.push(...tiered.trace, {
      kind: "validation",
      message: "Fallback path after HARD validation failure",
    });
    validated = { valid: tiered.hardValid, items: fallback, errors: tiered.structuralFixes };
    items = attachExplainabilityMetadata(validated.items, {
      signature: behaviorSignature,
      state,
      difficultyAdjustments: [],
      culturalChanges: [],
    });
    reverted = true;
    debugLog.push("reverted:validation_failed");
  } else {
    items = validated.items;
  }

  let polished = polishRoutineOutput(items, state, decisionTrace);
  polished = ensureSpecialEventsPreserved(polished, specialParse.events, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
  });
  polished = resolveTimelineOverlaps(polished, wakeMinsEarly, sleepMinsEarly);
  polished = ensureFixedActivitiesPreserved(polished, fixedParse.activities, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
  }, fixedParse.debug);

  const mealShift = shiftMealsAroundFixedBlocks(polished, fixedParse.activities, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
  });
  polished = mealShift.items;
  mergeTimelineShifts(fixedParse.debug, mealShift.shifts);
  fixedParse.debug.adjustmentsMade.push(...mealShift.adjustments);

  const isSchoolDayForMeals = resolveIsSchoolDay({
    hasSchool: flowOpts.hasSchool,
    isWeekendDay: flowOpts.isWeekendDay,
    date: flowOpts.referenceDate,
  });
  const mealFinalized = finalizeMealStructure(polished, {
    isSchoolDay: isSchoolDayForMeals,
    schoolEndMins: scheduleOpts.schoolEndMins,
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
  });
  polished = mealFinalized.items;
  if (mealFinalized.adjustments.length) {
    pipelineDebug(debug, debugLog, "finalizeMealStructure", mealFinalized.adjustments);
  }
  polished = enforceSleepIsLast(polished, decisionTrace);

  const realism = applyRoutineRealismPolish(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    isSchoolDay: isSchoolDayForMeals,
    isWeekendDay: flowOpts.isWeekendDay ?? false,
    ageGroup: scheduleOpts.ageGroup,
    seed:
      (input.childId?.length ?? 0) +
      (input.mealSeed ?? 0) +
      sleepMinsEarly,
  });
  polished = realism.items;
  if (realism.adjustments.length) {
    pipelineDebug(debug, debugLog, "routineRealismPolish", realism.adjustments);
    fixedParse.debug.adjustmentsMade.push(...realism.adjustments.slice(0, 8));
  }
  if (realism.warnings.length) {
    pipelineDebug(debug, debugLog, "routineRealismWarnings", realism.warnings);
  }
  polished = enforceSleepIsLast(polished, decisionTrace);

  const rainMode =
    /rain|drizzle|storm/i.test(
      input.builtContext.environment?.condition ??
        input.builtContext.weatherCondition ??
        "",
    ) || input.builtContext.weatherOutdoor === "no";

  const energyCurve = enforceEnergyCurve(polished, { rainMode });
  polished = energyCurve.items;
  if (energyCurve.adjustments.length) {
    pipelineDebug(debug, debugLog, "enforceEnergyCurve", energyCurve.adjustments);
    fixedParse.debug.adjustmentsMade.push(...energyCurve.adjustments.slice(0, 6));
  }

  polished = ensureFixedActivitiesPreserved(
    polished,
    fixedParse.activities,
    { wakeMins: wakeMinsEarly, sleepMins: sleepMinsEarly },
    fixedParse.debug,
  );
  polished = ensureSpecialEventsPreserved(polished, specialParse.events, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
  });
  polished = resolveTimelineOverlaps(polished, wakeMinsEarly, sleepMinsEarly);

  for (const c of mealShift.unresolved) {
    fixedParse.debug.conflicts.push(c);
    fixedParse.debug.conflictsDetected.push(c.warning);
  }
  fixedParse.debug.validationWarnings.push(...mealShift.warnings);

  polished = enforceSleepIsLast(polished, decisionTrace);
  const confidence = deriveRoutineConfidence(
    input.builtContext,
    state,
    state.country,
  );

  const specialEvent = validateSpecialEventsPlacement(polished, specialParse.events, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    schoolStartMins: scheduleOpts.schoolStartMins,
    schoolEndMins: scheduleOpts.schoolEndMins,
    hasSchool: scheduleOpts.hasSchool,
  });

  const fixedActivities = validateFixedActivitiesPlacement(
    polished,
    fixedParse.activities,
    {
      wakeMins: wakeMinsEarly,
      sleepMins: sleepMinsEarly,
      schoolStartMins: scheduleOpts.schoolStartMins,
      schoolEndMins: scheduleOpts.schoolEndMins,
      hasSchool: scheduleOpts.hasSchool,
    },
  );
  fixedActivities.conflicts.push(...fixedParse.debug.conflicts);
  fixedActivities.conflictsDetected.push(...fixedParse.debug.conflictsDetected);
  fixedActivities.adjustmentsMade.push(...fixedParse.debug.adjustmentsMade);
  fixedActivities.shiftsApplied.push(...fixedParse.debug.shiftsApplied);
  fixedActivities.validationWarnings.push(...fixedParse.debug.validationWarnings);

  for (const c of detectSpecialFixedConflicts(fixedParse.activities, specialParse.events)) {
    fixedActivities.conflicts.push(c);
    fixedActivities.conflictsDetected.push(c.warning);
  }

  finalizeFixedActivitiesSummary(fixedActivities);

  const finalIntegrity = enforceFinalTimelineIntegrity(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    aqi: state.aqi ?? input.builtContext.environment?.AQI ?? null,
    condition:
      input.builtContext.environment?.condition ??
      input.builtContext.weatherCondition ??
      null,
    hasSchool: flowOpts.hasSchool,
    isWeekendDay: flowOpts.isWeekendDay ?? false,
    country: state.country,
    eventStartMins: specialParse.events.map((e) => e.startMins),
    rainMode,
  });
  polished = finalIntegrity.items;
  if (finalIntegrity.adjustments.length) {
    pipelineDebug(debug, debugLog, "finalTimelineIntegrity", finalIntegrity.adjustments);
    fixedActivities.adjustmentsMade.push(
      ...finalIntegrity.adjustments.slice(0, 12).map((a) => `final: ${a}`),
    );
  }
  if (finalIntegrity.warnings.length) {
    pipelineDebug(debug, debugLog, "finalTimelineIntegrityWarnings", finalIntegrity.warnings);
    fixedActivities.validationWarnings.push(...finalIntegrity.warnings);
  }
  if (finalIntegrity.repaired) {
    pipelineDebug(debug, debugLog, "finalTimelineIntegrityRepaired", true);
  }

  return {
    items: polished,
    validated: validated.valid,
    reverted,
    behaviorSignature,
    state,
    difficultyAdjustments,
    culturalChanges,
    debugLog,
    validationErrors: [
      ...validated.errors,
      ...specialEvent.validationWarnings,
      ...fixedActivities.validationWarnings,
    ],
    decisionTrace,
    confidence,
    specialEvent,
    parsedSpecialEvent: specialParse.event,
    parsedSpecialEvents: specialParse.events,
    fixedActivities,
    parsedFixedActivities: fixedParse.activities,
  };
}
