/**
 * Adaptive completion pass — unifies continuity, freshness, and autonomy
 * after emotional pacing and before daily load balancing.
 */
import type { AgeGroup } from "./routine-templates.js";
import type { InterpretedBehavioralState } from "./routine-context-engine.js";
import { applyAutonomyDevelopment } from "./routine-autonomy-development.js";
import { applyDeterministicActivityFreshness } from "./routine-activity-freshness.js";
import { applyMultiDayContinuity } from "./routine-continuity.js";
import {
  buildPersonalizationMemory,
  type PersonalizationMemory,
  recordRoutineGenerationMemory,
} from "./routine-personalization-memory.js";
import type { RoutineActivityHistory } from "./routine-behavior-signature.js";
import { weekRotationSeed } from "./routine-deterministic-seed.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";
import type { EmotionalPacingProfile } from "./routine-emotional-pacing.js";
import type { DailyLoadProfile } from "./routine-daily-load.js";

export type AdaptiveCompletionContext = {
  childId?: string;
  routineDate: string;
  wakeMins: number;
  sleepMins: number;
  ageGroup?: AgeGroup;
  state: Pick<
    InterpretedBehavioralState,
    | "requireIndependenceTasks"
    | "labels"
    | "country"
  >;
  history?: RoutineActivityHistory;
  schoolEndMins?: number;
  hasSchool?: boolean;
  seed: number;
};

export type AdaptiveCompletionSummary = {
  memory: PersonalizationMemory;
  continuityAdjustments: string[];
  freshnessAdjustments: string[];
  autonomyAdjustments: string[];
};

export type AdaptiveCompletionResult = {
  items: RoutineScheduleItem[];
  summary: AdaptiveCompletionSummary;
};

/**
 * Run personalization completion passes (continuity → freshness → autonomy).
 */
export function runAdaptiveCompletionPass(
  items: RoutineScheduleItem[],
  ctx: AdaptiveCompletionContext,
): AdaptiveCompletionResult {
  const memory = buildPersonalizationMemory({
    childId: ctx.childId,
    history: ctx.history,
    routineDate: ctx.routineDate,
  });

  const weekSeed = weekRotationSeed(ctx.routineDate);

  const continuity = applyMultiDayContinuity(items, {
    memory,
    seed: ctx.seed + weekSeed,
    routineDate: ctx.routineDate,
  });

  const freshness = applyDeterministicActivityFreshness(continuity.items, {
    memory,
    seed: ctx.seed + 101 + weekSeed,
  });

  const autonomy = applyAutonomyDevelopment(freshness.items, {
    ageGroup: ctx.ageGroup,
    requireIndependenceTasks: ctx.state.requireIndependenceTasks,
    independenceMorningLabel: ctx.state.labels.independenceMorning,
    independenceEveningLabel: ctx.state.labels.independenceEvening,
    wakeMins: ctx.wakeMins,
    sleepMins: ctx.sleepMins,
    schoolEndMins: ctx.schoolEndMins,
    hasSchool: ctx.hasSchool,
  });

  return {
    items: autonomy.items,
    summary: {
      memory,
      continuityAdjustments: continuity.adjustments.map((a) => a.change),
      freshnessAdjustments: freshness.adjustments.map((a) => a.change),
      autonomyAdjustments: autonomy.adjustments.map((a) => a.change),
    },
  };
}

/** Persist generation fingerprints when child id is known. */
export function persistRoutinePersonalizationMemory(opts: {
  childId: string;
  routineDate: string;
  items: RoutineScheduleItem[];
}): void {
  recordRoutineGenerationMemory({
    childId: opts.childId,
    routineDate: opts.routineDate,
    activities: opts.items.map((i) => i.activity),
  });
}

export type ProductionDiagnosticsInput = {
  itemCount: number;
  validated: boolean;
  reverted: boolean;
  confidence: string;
  emotionalProfile?: EmotionalPacingProfile;
  loadProfileBefore?: DailyLoadProfile;
  loadProfileAfter?: DailyLoadProfile;
  completion?: AdaptiveCompletionSummary;
  adjustmentCount: number;
  warningCount: number;
  country: string;
  dayType: string;
};

export type RoutineProductionDiagnostics = {
  engineVersion: string;
  readinessScore: number;
  readinessTier: "production" | "staging" | "degraded";
  signals: {
    timelineValid: boolean;
    loadBalanced: boolean;
    emotionallyAdapted: boolean;
    personalized: boolean;
    explainabilityReady: boolean;
  };
  metrics: {
    itemCount: number;
    adjustmentCount: number;
    warningCount: number;
    loadBalanceScore?: number;
    emotionalState?: string;
    continuityPasses: number;
    freshnessPasses: number;
    autonomyPasses: number;
  };
  notes: string[];
};

const ENGINE_VERSION = "amynest-routine-intelligence-1.0";

/**
 * Production diagnostics bundle for observability and QA gates.
 */
export function buildRoutineProductionDiagnostics(
  input: ProductionDiagnosticsInput,
): RoutineProductionDiagnostics {
  const loadScore = input.loadProfileAfter?.balanceScore;
  const loadBalanced =
    loadScore == null || loadScore >= 70 || !input.loadProfileBefore?.issues.length;

  const emotionallyAdapted =
    !input.emotionalProfile ||
    input.emotionalProfile.state === "neutral" ||
    input.emotionalProfile.flowPattern !== "steady";

  const continuityPasses = input.completion?.continuityAdjustments.length ?? 0;
  const freshnessPasses = input.completion?.freshnessAdjustments.length ?? 0;
  const autonomyPasses = input.completion?.autonomyAdjustments.length ?? 0;
  const personalized =
    continuityPasses + freshnessPasses + autonomyPasses > 0 ||
    (input.completion?.memory.snapshotCount ?? 0) > 0;

  const notes: string[] = [];
  if (!input.validated) notes.push("hard validation failed");
  if (input.reverted) notes.push("pipeline reverted to fallback schedule");
  if (loadScore != null && loadScore < 60) {
    notes.push(`low load balance score (${loadScore})`);
  }
  if (input.emotionalProfile?.state && input.emotionalProfile.state !== "neutral") {
    notes.push(`emotional pacing: ${input.emotionalProfile.state}`);
  }

  let readinessScore = 100;
  if (!input.validated) readinessScore -= 40;
  if (input.reverted) readinessScore -= 25;
  if (loadScore != null && loadScore < 70) readinessScore -= 15;
  if (input.warningCount > 5) readinessScore -= 10;
  readinessScore = Math.max(0, Math.min(100, readinessScore));

  const readinessTier: RoutineProductionDiagnostics["readinessTier"] =
    readinessScore >= 85
      ? "production"
      : readinessScore >= 65
        ? "staging"
        : "degraded";

  return {
    engineVersion: ENGINE_VERSION,
    readinessScore,
    readinessTier,
    signals: {
      timelineValid: input.validated,
      loadBalanced,
      emotionallyAdapted,
      personalized,
      explainabilityReady: true,
    },
    metrics: {
      itemCount: input.itemCount,
      adjustmentCount: input.adjustmentCount,
      warningCount: input.warningCount,
      loadBalanceScore: loadScore,
      emotionalState: input.emotionalProfile?.state,
      continuityPasses,
      freshnessPasses,
      autonomyPasses,
    },
    notes,
  };
}
