/**
 * ============================================
 * PRODUCTION CERTIFIED — FROZEN
 * ============================================
 *
 * Certification:
 * - 54 scenario matrix
 * - 0 FAIL
 * - 0 health regressions
 * - 0 status regressions
 *
 * Known accepted warnings:
 * - India teen dinner geometry
 * - UAE teen dinner geometry
 * - USA toddler dinner edge case
 *
 * Do not modify timing behavior without:
 * 1. Architecture approval
 * 2. Full recertification (pnpm run check:routine-engine-certification)
 *
 * Routine Engine Version: v1.0 Certified (June 2026)
 * Registry: docs/routine-engine/ROUTINE_ENGINE_FROZEN_FILES.md
 * ============================================
 *
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
import { enrichItemsWithActivityMetadata } from "./routine-activity-metadata.js";
import { applyCulturalModeling, type CulturalModelingChange } from "./routine-cultural-modeling.js";
import {
  attachExplainabilityMetadata,
  refreshExplainabilityMetadata,
} from "./routine-explainability.js";
import {
  buildRoutineProductionDiagnostics,
  persistRoutinePersonalizationMemory,
  runAdaptiveCompletionPass,
  type AdaptiveCompletionSummary,
  type RoutineProductionDiagnostics,
} from "./routine-adaptive-completion.js";
import {
  finalizeFamilyIntelligenceMoat,
  prepareFamilyIntelligenceInput,
  type FamilyIntelligenceMoatResult,
} from "./routine-family-intelligence-moat.js";
import { weekRotationSeed } from "./routine-deterministic-seed.js";
import { deriveIntelligenceTier } from "./routine-parent-intelligence.js";
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
import { applyRoutineContentIntegrity } from "./routine-content-integrity.js";
import { applyRoutineRealismPolish } from "./routine-realism-polish.js";
import { applyRoutineOptimizationEngine, applyDecisionEnforcedFinalPass } from "./routine-optimization-engine.js";
import { adaptRoutineForEmotion } from "./routine-emotional-pacing.js";
import { applyDailyLoadBalancing } from "./routine-daily-load.js";
import { enforceEnergyCurve } from "./routine-category-taxonomy.js";
import {
  enforceFinalTimelineIntegrity,
  enforceWakeAnchor,
  resolveOverlapsByPriority,
  enforceSleepBoundary,
} from "./routine-final-integrity.js";
import { runTieredValidation } from "./routine-validation-tiers.js";
import { finalizeMealStructure } from "./routine-meal-day-type.js";
import { repairDinnerAnchor } from "./routine-meal-dinner-integrity.js";
import { resolveIsSchoolDay } from "./routine-meal-day-type.js";
import {
  applyMealAwareScheduling,
  enrichRoutineMeals,
  validateMealActivityIntegration,
} from "./routine-meal-integration.js";
import {
  sanitizeMealOptionsInRoutineItems,
  type MealOptionsSanitizeCtx,
} from "./routine-meal-options-safety.js";
import {
  getAgeGroup,
  isExclusiveInfantPhase,
  normalizeInfant612FeedingSchedule,
  shouldSkipCountryCulture,
} from "./routine-age-feeding.js";
import {
  generateValidatedInfantRoutine,
  type InfantFeedingMode,
} from "./infant-adaptive-routine.js";
import { validateInfantPipelineSchedule } from "./routine-infant-schedule-validation.js";
import { runBlockingTrustValidation, validateInfantFeedingStructure } from "./routine-trust-validators.js";
import {
  buildEmergencySafeRoutine,
  repairTrustValidationFailures,
  type EmergencyRoutineOpts,
} from "./routine-emergency-fallback.js";
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
  // ── Decision-enforced layer (forwarded to optimization engine) ──────────
  /** `home_lunch | packed_lunch | school_lunch | cafeteria | …` */
  schoolMealMode?: string | null;
  /** `vegetarian | mixed | non_veg | …` (parent-level diet hint). */
  diet?: string | null;
  /** `mom | dad | both | grandparent | babysitter | self`. */
  caregiver?: string | null;
  /** Comma-separated allergens — drives post-enrichment meal option sanitizer. */
  allergies?: string | null;
  goals?: string | null;
  foodStyle?: string | null;
  subCuisine?: string | null;
};

export type IntelligenceTier = "full" | "simplified" | "baseline";

export type IntelligencePipelineResult = {
  items: RoutineScheduleItem[];
  validated: boolean;
  reverted: boolean;
  /** How much multi-day personalization was applied (parent-facing). */
  intelligenceTier: IntelligenceTier;
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
  /** Multi-day continuity + freshness + autonomy summary. */
  adaptiveCompletion?: AdaptiveCompletionSummary;
  /** Production readiness signals for QA and observability. */
  productionDiagnostics?: RoutineProductionDiagnostics;
  /** Long-horizon family intelligence moat (trajectory + insights). */
  familyIntelligence?: FamilyIntelligenceMoatResult;
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

type PipelineOutput = ReturnType<typeof runRoutineIntelligencePipeline>;

function finalizeWithEmergencyFallback(
  result: PipelineOutput,
  emergencyOpts: EmergencyRoutineOpts,
): PipelineOutput {
  if (result.validated) return result;
  const emergency = buildEmergencySafeRoutine(emergencyOpts);
  const wake = emergencyOpts.wakeUpTime;
  const sleep = emergencyOpts.sleepTime;
  const hard = hardValidateSchedule(emergency, wake, sleep);
  const trust = runBlockingTrustValidation(emergency, {
    wakeMins: emergencyOpts.wakeUpTime ? parseTimeToMins(wake) : 0,
    sleepMins: parseTimeToMins(sleep),
    ageGroup: emergencyOpts.ageGroup,
    ageInMonths: emergencyOpts.ageInMonths,
    country: emergencyOpts.country,
    hasSchool: emergencyOpts.hasSchool,
  });
  if (!hard.valid || !trust.valid) return result;
  return {
    ...result,
    items: emergency,
    validated: true,
    reverted: true,
    validationErrors: [],
    debugLog: [...result.debugLog, "emergency_safe_routine_fallback"],
    confidence: "medium",
  };
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
  const { scheduleOpts, childProfile, debug } = input;

  const routineDate =
    input.routineDate ??
    input.builtContext.referenceDate?.toISOString().slice(0, 10) ??
    new Date().toISOString().slice(0, 10);

  const historyForMoat =
    input.behaviorHistory ??
    buildHistoryFromOutcomeStore(
      input.childId,
      input.builtContext.previousDayContext,
    );

  const moatPrep = prepareFamilyIntelligenceInput({
    childId: input.childId,
    routineDate,
    builtContext: input.builtContext,
    history: historyForMoat,
  });
  const builtContext = moatPrep.enrichedContext;

  const history =
    input.behaviorHistory ??
    buildHistoryFromOutcomeStore(input.childId, builtContext.previousDayContext);
  if (moatPrep.applied) {
    pipelineDebug(debug, debugLog, "familyIntelligencePrepare", {
      trustScore: moatPrep.profile?.trustScore,
      hints: moatPrep.profile?.predictiveHints,
    });
  }

  const behaviorSignature = deriveChildBehaviorSignature(childProfile, history);
  pipelineDebug(debug, debugLog, "behaviorSignature", behaviorSignature);

  let state = deriveBehavioralState(builtContext, childProfile);
  if (moatPrep.profile?.predictiveHints.suggestReduceStudy) {
    state = { ...state, reduceStudyBlocks: true };
  }
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
    infantItems = enforceSleepBoundary(infantItems, sleepMins, wakeMins).items;
    infantItems = resolveOverlapsByPriority(infantItems, sleepMins).items;
    const hard = hardValidateSchedule(infantItems, wake, sleep);
    const feedingTrust = validateInfantFeedingStructure(infantItems, {
      ageInMonths: ageInMonthsEarly ?? 4,
      wakeMins,
      sleepMins,
    });
    const sleepTrust = runBlockingTrustValidation(infantItems, {
      wakeMins,
      sleepMins,
      ageGroup: "infant",
      ageInMonths: ageInMonthsEarly,
      country: state.country,
      hasSchool: false,
    });
    const infantValid =
      hard.valid && feedingTrust.valid && sleepTrust.valid;
    pipelineDebug(debug, debugLog, "infant_0_6_exclusive_path", {
      hardValid: hard.valid,
      feedingTrust: feedingTrust.valid,
      sleepTrust: sleepTrust.valid,
    });
    const emergencyOpts: EmergencyRoutineOpts = {
      wakeUpTime: wake,
      sleepTime: sleep,
      ageInMonths: ageInMonthsEarly ?? 4,
      ageGroup: "infant",
      country: state.country,
      hasSchool: false,
      feedingType: feedingType as EmergencyRoutineOpts["feedingType"],
      seed: mealSeed,
    };
    return finalizeWithEmergencyFallback(
      {
      items: infantItems,
      validated: infantValid,
      reverted: !infantValid,
      intelligenceTier: "baseline",
      behaviorSignature,
      state,
      difficultyAdjustments: [],
      culturalChanges: [],
      debugLog: [...debugLog, "infant_0_6_exclusive_path"],
      validationErrors: [
        ...hard.errors,
        ...feedingTrust.errors,
        ...sleepTrust.errors,
      ],
      decisionTrace,
      confidence: "high",
      specialEvent: specialParse.debug,
      parsedSpecialEvent: specialParse.event,
      parsedSpecialEvents: specialParse.events,
      fixedActivities: fixedParse.debug,
      parsedFixedActivities: fixedParse.activities,
    },
      emergencyOpts,
    );
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
      ageMonths: ageInMonthsEarly ?? 6,
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
    let infantItems = validated.result.items;
    infantItems = enforceSleepBoundary(
      infantItems,
      parseTimeToMins(sleep),
      parseTimeToMins(wake),
    ).items;
    infantItems = resolveOverlapsByPriority(
      infantItems,
      parseTimeToMins(sleep),
    ).items;
    infantItems = normalizeInfant612FeedingSchedule(infantItems, {
      wakeMins: parseTimeToMins(wake),
      sleepMins: parseTimeToMins(sleep),
      ageInMonths: ageInMonthsEarly ?? 6,
      feedingType: input.feedingType ?? childProfile.feedingType,
      seed: input.mealSeed ?? ageInMonthsEarly,
    });
    infantItems = enrichRoutineMeals(infantItems, {
      country: state.country,
      ageInMonths: ageInMonthsEarly,
      feedingType: input.feedingType ?? childProfile.feedingType,
      seed: input.mealSeed,
      feedingAgeGroup: "infant_6_12",
    });
    infantItems = enforceSleepBoundary(
      infantItems,
      parseTimeToMins(sleep),
      parseTimeToMins(wake),
    ).items;
    infantItems = resolveOverlapsByPriority(
      infantItems,
      parseTimeToMins(sleep),
    ).items;
    const wakeAnchorAdaptive = enforceWakeAnchor(
      infantItems,
      parseTimeToMins(wake),
      parseTimeToMins(sleep),
    );
    if (wakeAnchorAdaptive.adjustments.length) {
      infantItems = wakeAnchorAdaptive.items;
    }
    const infantSafety = validateInfantPipelineSchedule(infantItems, {
      ageMonths: ageInMonthsEarly ?? 6,
      wakeMins: parseTimeToMins(wake),
      sleepMins: parseTimeToMins(sleep),
    });
    const feedingTrust = validateInfantFeedingStructure(infantItems, {
      ageInMonths: ageInMonthsEarly ?? 6,
      wakeMins: parseTimeToMins(wake),
      sleepMins: parseTimeToMins(sleep),
    });
    const hard = hardValidateSchedule(infantItems, wake, sleep);
    const scheduleValid =
      hard.valid && infantSafety.valid && feedingTrust.valid;
    pipelineDebug(debug, debugLog, "infant_adaptive_validated_path", {
      realismScore: validated.realismScore.total,
      blocks: validated.result.blocks.length,
      auditPassed: validated.finalAudit.allPassed,
      schedulerValid: hard.valid,
      infantSafetyValid: infantSafety.valid,
      feedingTrustValid: feedingTrust.valid,
    });
    const emergencyOpts: EmergencyRoutineOpts = {
      wakeUpTime: wake,
      sleepTime: sleep,
      ageInMonths: ageInMonthsEarly ?? 6,
      ageGroup: "infant",
      country: state.country,
      hasSchool: false,
      feedingType: (input.feedingType ?? childProfile.feedingType) as EmergencyRoutineOpts["feedingType"],
      seed: input.mealSeed,
    };
    return finalizeWithEmergencyFallback(
      {
      items: infantItems,
      validated: scheduleValid,
      reverted: !scheduleValid || !validated.finalAudit.allPassed,
      intelligenceTier: "baseline",
      behaviorSignature,
      state,
      difficultyAdjustments: [],
      culturalChanges: [],
      debugLog: [...debugLog, "infant_adaptive_validated_path"],
      validationErrors: scheduleValid
        ? []
        : [
            ...(validated.finalAudit.allPassed
              ? []
              : validated.finalAudit.results
                  .filter((r) => r.status === "FAIL")
                  .flatMap((r) => r.details)),
            ...infantSafety.errors,
            ...feedingTrust.errors,
            ...hard.errors,
          ],
      decisionTrace,
      confidence: scheduleValid ? "high" : "medium",
      specialEvent: specialParse.debug,
      parsedSpecialEvent: specialParse.event,
      parsedSpecialEvents: specialParse.events,
      fixedActivities: fixedParse.debug,
      parsedFixedActivities: fixedParse.activities,
    },
      emergencyOpts,
    );
  }

  let items: RoutineScheduleItem[] = enrichItemsWithActivityMetadata(
    cloneItems(input.items).map((it) => ({
      ...it,
      time: normalizeTo24h(it.time),
    })),
  );

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
  const mealSafetyCtx: MealOptionsSanitizeCtx = {
    dietType: input.diet ?? "vegetarian",
    allergies: input.allergies ?? null,
    ageInMonths,
    ageGroup: scheduleOpts.ageGroup,
    foodStyle: input.foodStyle ?? null,
    subCuisine: input.subCuisine ?? null,
    goals: input.goals ?? null,
  };
  const sanitizedMeals = sanitizeMealOptionsInRoutineItems(items, mealSafetyCtx);
  items = sanitizedMeals.items;
  if (sanitizedMeals.corrections.length) {
    pipelineDebug(debug, debugLog, "meal option safety corrections", sanitizedMeals.corrections);
  }
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
    fallback = sanitizeMealOptionsInRoutineItems(fallback, mealSafetyCtx).items;
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

  let polished: RoutineScheduleItem[] = polishRoutineOutput(items, state, decisionTrace);
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
    country: state.country,
    ageInMonths: ageInMonthsEarly,
  });
  polished = mealFinalized.items;
  if (mealFinalized.adjustments.length) {
    pipelineDebug(debug, debugLog, "finalizeMealStructure", mealFinalized.adjustments);
  }
  polished = enforceSleepIsLast(polished, decisionTrace);

  const ageYears =
    input.ageInMonths != null
      ? Math.floor(input.ageInMonths / 12)
      : childProfile.ageInMonths != null
        ? Math.floor(childProfile.ageInMonths / 12)
        : undefined;
  const optimized = applyRoutineOptimizationEngine(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    isSchoolDay: isSchoolDayForMeals,
    isWeekendDay: flowOpts.isWeekendDay ?? false,
    schoolStartMins: scheduleOpts.schoolStartMins,
    schoolEndMins: scheduleOpts.schoolEndMins,
    weatherOutdoor: builtContext.weatherOutdoor,
    temperatureC:
      builtContext.temperatureC ??
      builtContext.environment?.temperature ??
      null,
    ageGroup: scheduleOpts.ageGroup,
    // Decision-enforced layer signals
    age: ageYears,
    academicIntensity: builtContext.countryProfile.academicIntensity,
    independenceLevel: builtContext.countryProfile.independenceLevel,
    dinnerWindow: builtContext.countryProfile.dinnerWindow,
    schoolMealMode: input.schoolMealMode,
    diet: input.diet,
    caregiver: input.caregiver,
    region: builtContext.region,
    country: builtContext.country,
  });
  polished = optimized.items;
  if (optimized.adaptations.length) {
    pipelineDebug(debug, debugLog, "routineOptimizationEngine", optimized.adaptations);
    fixedParse.debug.adjustmentsMade.push(
      ...optimized.adaptations.slice(0, 10).map((a) => `optimize: ${a}`),
    );
  }

  const realism = applyRoutineRealismPolish(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    isSchoolDay: isSchoolDayForMeals,
    isWeekendDay: flowOpts.isWeekendDay ?? false,
    schoolStartMins: scheduleOpts.schoolStartMins,
    schoolEndMins: scheduleOpts.schoolEndMins,
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
      input.builtContext.environment?.condition ?? "",
    ) || input.builtContext.weatherOutdoor === "no";

  const weekSeed = weekRotationSeed(routineDate);
  const completionSeed =
    (input.childId?.length ?? 0) +
    (input.mealSeed ?? 0) +
    wakeMinsEarly +
    weekSeed +
    17;

  const emotionPass = adaptRoutineForEmotion(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    mood: builtContext.mood,
    moodScore: history.previousDayContext?.moodScore,
    previousMoodScore: builtContext.previousDayContext?.moodScore,
    sleepQuality:
      builtContext.previousDayContext?.sleepQuality ??
      history.previousDayContext?.sleepQuality,
    ageGroup: scheduleOpts.ageGroup,
    energyLevel: state.energyLevel,
    dayType: state.dayType,
    rainMode,
    seed:
      (input.childId?.length ?? 0) +
      (input.mealSeed ?? 0) +
      sleepMinsEarly +
      weekSeed +
      17,
  });
  polished = emotionPass.items;
  if (emotionPass.adjustments.length) {
    pipelineDebug(debug, debugLog, "emotionalPacing", {
      state: emotionPass.profile.state,
      flow: emotionPass.profile.flowPattern,
      guidance: emotionPass.profile.parentGuidance,
      adjustments: emotionPass.adjustments,
    });
    fixedParse.debug.adjustmentsMade.push(
      ...emotionPass.adjustments.slice(0, 8).map(
        (a) => `emotion(${a.state}): ${a.change}`,
      ),
    );
    polished = resolveTimelineOverlaps(
      polished,
      wakeMinsEarly,
      sleepMinsEarly,
    );
  }

  const completionPass = runAdaptiveCompletionPass(polished, {
    childId: input.childId,
    routineDate,
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    ageGroup: scheduleOpts.ageGroup,
    state,
    history,
    schoolEndMins: scheduleOpts.schoolEndMins,
    hasSchool: scheduleOpts.hasSchool,
    seed: completionSeed + 203,
  });
  polished = completionPass.items;
  const adaptiveCompletion = completionPass.summary;
  const completionAdjustments =
    adaptiveCompletion.continuityAdjustments.length +
    adaptiveCompletion.freshnessAdjustments.length +
    adaptiveCompletion.autonomyAdjustments.length;
  if (completionAdjustments > 0) {
    pipelineDebug(debug, debugLog, "adaptiveCompletion", adaptiveCompletion);
    fixedParse.debug.adjustmentsMade.push(
      ...[
        ...adaptiveCompletion.continuityAdjustments,
        ...adaptiveCompletion.freshnessAdjustments,
        ...adaptiveCompletion.autonomyAdjustments,
      ].slice(0, 8),
    );
    polished = resolveTimelineOverlaps(
      polished,
      wakeMinsEarly,
      sleepMinsEarly,
    );
  }

  const loadBalance = applyDailyLoadBalancing(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    ageGroup: scheduleOpts.ageGroup,
    energyLevel: state.energyLevel,
    dayType: state.dayType,
    sleepQuality:
      builtContext.previousDayContext?.sleepQuality ??
      history.previousDayContext?.sleepQuality,
    mood: builtContext.mood,
    reduceStudyBlocks: state.reduceStudyBlocks,
    rainMode,
    seed:
      (input.childId?.length ?? 0) +
      (input.mealSeed ?? 0) +
      wakeMinsEarly,
  });
  polished = loadBalance.items;
  if (loadBalance.adjustments.length) {
    pipelineDebug(debug, debugLog, "dailyLoadBalancing", {
      before: loadBalance.profile.balanceScore,
      after: loadBalance.profileAfter.balanceScore,
      issues: loadBalance.profile.issues.map((i) => i.message),
      adjustments: loadBalance.adjustments,
    });
    fixedParse.debug.adjustmentsMade.push(
      ...loadBalance.adjustments.slice(0, 8),
    );
    polished = resolveTimelineOverlaps(
      polished,
      wakeMinsEarly,
      sleepMinsEarly,
    );
  }

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
      input.builtContext.environment?.condition ?? null,
    hasSchool: flowOpts.hasSchool,
    isWeekendDay: flowOpts.isWeekendDay ?? false,
    country: state.country,
    ageInMonths: ageInMonthsEarly,
    dinnerWindow: input.builtContext.countryProfile.dinnerWindow,
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

  // Final safety net — re-apply the relabel/recover-only subset of the
  // decision-enforced layer. Time-preserving so it cannot introduce
  // overlaps; catches downstream label/category drift from realism polish,
  // energy curve, and timeline integrity.
  const finalEnforcement = applyDecisionEnforcedFinalPass(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    isSchoolDay: isSchoolDayForMeals,
    isWeekendDay: flowOpts.isWeekendDay ?? false,
    schoolStartMins: scheduleOpts.schoolStartMins,
    schoolEndMins: scheduleOpts.schoolEndMins,
    weatherOutdoor: input.builtContext.weatherOutdoor,
    temperatureC:
      input.builtContext.temperatureC ??
      input.builtContext.environment?.temperature ??
      null,
    ageGroup: scheduleOpts.ageGroup,
    age: ageYears,
    academicIntensity: input.builtContext.countryProfile.academicIntensity,
    independenceLevel: input.builtContext.countryProfile.independenceLevel,
    dinnerWindow: input.builtContext.countryProfile.dinnerWindow,
    schoolMealMode: input.schoolMealMode,
    diet: input.diet,
    caregiver: input.caregiver,
    region: input.builtContext.region,
    country: input.builtContext.country,
  });
  polished = enrichItemsWithActivityMetadata(finalEnforcement.items);
  if (finalEnforcement.adaptations.length) {
    pipelineDebug(debug, debugLog, "decisionEnforcedFinal", finalEnforcement.adaptations);
  }

  let dinnerRepairFinal = repairDinnerAnchor(polished, {
    country: state.country,
    sleepMins: sleepMinsEarly,
    ageInMonths: ageInMonthsEarly,
    dinnerWindow: input.builtContext.countryProfile.dinnerWindow,
  });
  if (dinnerRepairFinal.adjustments.length) {
    pipelineDebug(debug, debugLog, "dinnerRepairFinal", dinnerRepairFinal.adjustments);
    polished = dinnerRepairFinal.items;
    fixedActivities.adjustmentsMade.push(
      ...dinnerRepairFinal.adjustments.slice(0, 6).map((a) => `dinner: ${a}`),
    );
  }
  const postDinnerOverlap = resolveOverlapsByPriority(polished, sleepMinsEarly);
  if (postDinnerOverlap.adjustments.length) {
    polished = postDinnerOverlap.items;
    dinnerRepairFinal = repairDinnerAnchor(polished, {
      country: state.country,
      sleepMins: sleepMinsEarly,
      ageInMonths: ageInMonthsEarly,
      dinnerWindow: input.builtContext.countryProfile.dinnerWindow,
    });
    polished = dinnerRepairFinal.items;
  }

  if (state.country === "AE") {
    polished = enforceUaeOutdoorHardConstraint(polished, decisionTrace);
    polished = resolveOverlapsByPriority(polished, sleepMinsEarly).items;
    const dinnerAfterUae = repairDinnerAnchor(polished, {
      country: state.country,
      sleepMins: sleepMinsEarly,
      ageInMonths: ageInMonthsEarly,
      dinnerWindow: input.builtContext.countryProfile.dinnerWindow,
    });
    polished = dinnerAfterUae.items;
  }

  const wakeAnchorFinal = enforceWakeAnchor(polished, wakeMinsEarly, sleepMinsEarly);
  if (wakeAnchorFinal.adjustments.length) {
    pipelineDebug(debug, debugLog, "wakeAnchorFinal", wakeAnchorFinal.adjustments);
    polished = wakeAnchorFinal.items;
    fixedActivities.adjustmentsMade.push(
      ...wakeAnchorFinal.adjustments.slice(0, 4).map((a) => `wake: ${a}`),
    );
  }
  polished = resolveOverlapsByPriority(polished, sleepMinsEarly).items;
  if (state.country === "AE") {
    polished = repairDinnerAnchor(polished, {
      country: state.country,
      sleepMins: sleepMinsEarly,
      ageInMonths: ageInMonthsEarly,
      dinnerWindow: input.builtContext.countryProfile.dinnerWindow,
    }).items;
  }

  const postIntegrityTrust = runBlockingTrustValidation(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    ageGroup: scheduleOpts.ageGroup,
    ageInMonths: ageInMonthsEarly,
    country: state.country,
    hasSchool: flowOpts.hasSchool,
  });
  if (!postIntegrityTrust.valid) {
    pipelineDebug(debug, debugLog, "postIntegrityTrustFailed", postIntegrityTrust.errors);
    validated = {
      valid: false,
      items: polished,
      errors: [
        ...validated.errors.filter((e) => !e.startsWith("trust-")),
        ...postIntegrityTrust.errors,
      ],
    };
    reverted = true;
    debugLog.push("reverted:post_integrity_trust_failed");
    fixedActivities.validationWarnings.push(...postIntegrityTrust.errors);
  } else {
    validated = {
      valid: true,
      items: polished,
      errors: validated.errors.filter((e) => !e.startsWith("trust-")),
    };
  }

  polished = refreshExplainabilityMetadata(polished, {
    signature: behaviorSignature,
    state,
    difficultyAdjustments,
    culturalChanges,
  });

  const contentIntegrity = applyRoutineContentIntegrity(polished, {
    sleepMins: sleepMinsEarly,
    wakeMins: wakeMinsEarly,
    ageGroup: scheduleOpts.ageGroup,
  });
  polished = contentIntegrity.items;
  if (contentIntegrity.adjustments.length) {
    pipelineDebug(debug, debugLog, "contentIntegrity", contentIntegrity.adjustments);
    fixedActivities.adjustmentsMade.push(
      ...contentIntegrity.adjustments.slice(0, 10).map((a) => `display: ${a}`),
    );
  }

  // P0-3: re-run blocking trust validation AFTER the content-integrity display
  // pass so `validated` reflects the EXACT items we return (content integrity
  // can rename/relabel blocks). A routine that passed earlier but no longer
  // satisfies sleep / dinner / infant-feeding rules must be reported as
  // validated:false so no caller exposes it.
  const finalTrust = runBlockingTrustValidation(polished, {
    wakeMins: wakeMinsEarly,
    sleepMins: sleepMinsEarly,
    ageGroup: scheduleOpts.ageGroup,
    ageInMonths: ageInMonthsEarly,
    country: state.country,
    hasSchool: flowOpts.hasSchool,
  });
  if (!finalTrust.valid) {
    const trustRepair = repairTrustValidationFailures(polished, {
      wakeUpTime: scheduleOpts.wakeUpTime,
      sleepTime: scheduleOpts.sleepTime,
      ageInMonths: ageInMonthsEarly ?? childProfile.ageInMonths ?? 4,
      ageGroup: scheduleOpts.ageGroup,
      country: state.country,
      hasSchool: flowOpts.hasSchool,
      feedingType: input.feedingType ?? childProfile.feedingType,
    });
    if (trustRepair.repaired) {
      polished = trustRepair.items;
      validated = {
        valid: true,
        items: polished,
        errors: validated.errors.filter((e) => !e.startsWith("trust-")),
      };
      debugLog.push("repaired:final_trust_failures");
    } else {
      pipelineDebug(debug, debugLog, "finalTrustFailed", finalTrust.errors);
      validated = {
        valid: false,
        items: polished,
        errors: [
          ...validated.errors.filter((e) => !e.startsWith("trust-")),
          ...finalTrust.errors,
        ],
      };
      reverted = true;
      if (!debugLog.includes("reverted:post_integrity_trust_failed")) {
        debugLog.push("reverted:final_trust_failed");
      }
      fixedActivities.validationWarnings.push(...finalTrust.errors);
    }
  }

  if (input.childId) {
    persistRoutinePersonalizationMemory({
      childId: input.childId,
      routineDate,
      items: polished,
    });
  }

  const adjustmentCount = fixedParse.debug.adjustmentsMade.length;
  const warningCount =
    validated.errors.length +
    specialEvent.validationWarnings.length +
    fixedActivities.validationWarnings.length;

  const productionDiagnostics = buildRoutineProductionDiagnostics({
    itemCount: polished.length,
    validated: validated.valid,
    reverted,
    confidence,
    emotionalProfile: emotionPass.profile,
    loadProfileBefore: loadBalance.profile,
    loadProfileAfter: loadBalance.profileAfter,
    completion: adaptiveCompletion,
    adjustmentCount,
    warningCount,
    country: state.country,
    dayType: state.dayType,
  });
  pipelineDebug(debug, debugLog, "productionDiagnostics", productionDiagnostics);

  const intelligenceTier = deriveIntelligenceTier({
    reverted,
    childId: input.childId,
    snapshotCount: moatPrep.profile?.memory.snapshotCount ?? 0,
    infantExclusive: isExclusiveInfantPhase(ageInMonthsEarly),
  });

  let familyIntelligence: FamilyIntelligenceMoatResult | undefined;
  if (input.childId && moatPrep.profile) {
    familyIntelligence = finalizeFamilyIntelligenceMoat({
      childId: input.childId,
      routineDate,
      profile: moatPrep.profile,
      items: polished,
      productionDiagnostics,
      adaptiveCompletion,
      emotionalProfile: emotionPass.profile,
    });
    pipelineDebug(debug, debugLog, "familyIntelligenceFinalize", {
      trustScore: familyIntelligence.profile.trustScore,
      insightCount: familyIntelligence.insights.length,
    });
  }

  return finalizeWithEmergencyFallback(
    {
      items: polished,
      validated: validated.valid,
      reverted,
      intelligenceTier,
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
      adaptiveCompletion,
      productionDiagnostics,
      familyIntelligence,
    },
    {
      wakeUpTime: scheduleOpts.wakeUpTime,
      sleepTime: scheduleOpts.sleepTime,
      ageInMonths: ageInMonthsEarly ?? 36,
      ageGroup: scheduleOpts.ageGroup,
      country: state.country,
      hasSchool: flowOpts.hasSchool,
      feedingType: input.feedingType ?? childProfile.feedingType,
      seed: input.mealSeed,
    },
  );
}
