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
import { runTieredValidation } from "./routine-validation-tiers.js";
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
import { getRoutineOutcomeStore } from "./routine-outcome-log.js";
import {
  injectSpecialEventBlock,
  parseSpecialPlans,
  validateSpecialEventPlacement,
  type ParsedSpecialEvent,
  type SpecialEventDebug,
} from "./routine-special-event.js";
import { resolveRoutineSchedule } from "./routine-scheduler.js";
import {
  hardValidateSchedule,
  minsToTime24,
  normalizeTo24h,
  parseTimeToMins,
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
  /** Raw parent special plans text. */
  specialPlans?: string;
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
    };
  }

  let items = cloneItems(input.items).map((it) => ({
    ...it,
    time: normalizeTo24h(it.time),
  }));

  if (specialParse.event) {
    items = injectSpecialEventBlock(items, specialParse.event);
    pipelineDebug(debug, debugLog, "specialEventInjected", specialParse.event);
    decisionTrace.push({
      kind: "priority",
      message: `Special event locked: ${specialParse.event.activity} @ ${minsToTime24(specialParse.event.startMins)}`,
      detail: { type: specialParse.event.type, source: specialParse.event.timeSource },
    });
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

  const polished = polishRoutineOutput(items, state, decisionTrace);
  const confidence = deriveRoutineConfidence(
    input.builtContext,
    state,
    state.country,
  );

  const specialEvent = validateSpecialEventPlacement(
    polished,
    specialParse.event,
    {
      wakeMins: wakeMinsEarly,
      sleepMins: sleepMinsEarly,
      schoolStartMins: scheduleOpts.schoolStartMins,
      schoolEndMins: scheduleOpts.schoolEndMins,
      hasSchool: scheduleOpts.hasSchool,
    },
  );

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
    ],
    decisionTrace,
    confidence,
    specialEvent,
    parsedSpecialEvent: specialParse.event,
  };
}
