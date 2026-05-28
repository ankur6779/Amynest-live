/**
 * Family intelligence moat — long-horizon platform layer above the routine engine.
 * Unifies trajectory, predictive context, insights, and durable child-scoped memory.
 */
import type { BuiltRoutineContext } from "./routine-context-builder.js";
import type { RoutineActivityHistory } from "./routine-behavior-signature.js";
import {
  buildPersonalizationMemory,
  type PersonalizationMemory,
} from "./routine-personalization-memory.js";
import {
  calculateDevelopmentalTrajectory,
  type DevelopmentalTrajectory,
} from "./routine-developmental-trajectory.js";
import {
  buildPredictiveDayContext,
  type PredictiveDayHints,
} from "./routine-predictive-context.js";
import { generateFamilyInsights, type FamilyInsight } from "./routine-family-insights.js";
import {
  getFamilyIntelligenceStore,
  weekKeyFromDate,
} from "./routine-family-intelligence-store.js";
import type { RoutineProductionDiagnostics } from "./routine-adaptive-completion.js";
import type { AdaptiveCompletionSummary } from "./routine-adaptive-completion.js";
import type { EmotionalPacingProfile } from "./routine-emotional-pacing.js";
import type { RoutineScheduleItem } from "./routine-scheduler.js";

export const FAMILY_INTELLIGENCE_MOAT_VERSION = "amynest-family-intelligence-1.0";

export type FamilyIntelligenceProfile = {
  moatVersion: string;
  childId: string;
  routineDate: string;
  trajectory: DevelopmentalTrajectory;
  memory: PersonalizationMemory;
  predictiveHints: PredictiveDayHints;
  trustScore: number;
};

export type FamilyIntelligencePrepareInput = {
  childId?: string;
  routineDate: string;
  builtContext: BuiltRoutineContext;
  history?: RoutineActivityHistory;
};

export type FamilyIntelligencePrepareResult = {
  enrichedContext: BuiltRoutineContext;
  profile: FamilyIntelligenceProfile | null;
  applied: boolean;
};

export type FamilyIntelligenceFinalizeInput = {
  childId: string;
  routineDate: string;
  profile: FamilyIntelligenceProfile;
  items: RoutineScheduleItem[];
  productionDiagnostics?: RoutineProductionDiagnostics;
  adaptiveCompletion?: AdaptiveCompletionSummary;
  emotionalProfile?: EmotionalPacingProfile;
};

export type FamilyIntelligenceMoatResult = {
  profile: FamilyIntelligenceProfile;
  insights: FamilyInsight[];
  platformReadiness: "family_intelligence_active";
};

function trustScoreFromSignals(opts: {
  trajectory: DevelopmentalTrajectory;
  diagnostics?: RoutineProductionDiagnostics;
  hints: PredictiveDayHints;
}): number {
  let score = 72;
  if (opts.trajectory.consistencyTrend === "improving") score += 10;
  if (opts.trajectory.regulationTrend === "improving") score += 8;
  if (opts.trajectory.consistencyTrend === "needs_support") score -= 12;
  if (opts.diagnostics?.readinessScore != null) {
    score = Math.round((score + opts.diagnostics.readinessScore) / 2);
  }
  if (opts.hints.confidence === "high") score += 5;
  return Math.max(0, Math.min(100, score));
}

/**
 * Pre-pipeline: build trajectory + predictive context; enrich built context for state derivation.
 */
export function prepareFamilyIntelligenceInput(
  input: FamilyIntelligencePrepareInput,
): FamilyIntelligencePrepareResult {
  if (!input.childId) {
    return { enrichedContext: input.builtContext, profile: null, applied: false };
  }

  const memory = buildPersonalizationMemory({
    childId: input.childId,
    history: input.history,
    routineDate: input.routineDate,
  });

  const trajectory = calculateDevelopmentalTrajectory({
    childId: input.childId,
    memory,
    history: input.history,
  });

  const predictive = buildPredictiveDayContext({
    trajectory,
    memory,
    previousDayContext: input.builtContext.previousDayContext,
  });

  const profile: FamilyIntelligenceProfile = {
    moatVersion: FAMILY_INTELLIGENCE_MOAT_VERSION,
    childId: input.childId,
    routineDate: input.routineDate,
    trajectory,
    memory,
    predictiveHints: predictive.hints,
    trustScore: trustScoreFromSignals({
      trajectory,
      hints: predictive.hints,
    }),
  };

  const enrichedContext: BuiltRoutineContext = {
    ...input.builtContext,
    previousDayContext:
      predictive.enrichedPreviousDay ?? input.builtContext.previousDayContext,
  };

  return {
    enrichedContext,
    profile,
    applied: true,
  };
}

/**
 * Post-pipeline: persist trajectory, update weekly rhythm, emit parent insights.
 */
export function finalizeFamilyIntelligenceMoat(
  input: FamilyIntelligenceFinalizeInput,
): FamilyIntelligenceMoatResult {
  const store = getFamilyIntelligenceStore();

  store.appendTrajectory({
    childId: input.childId,
    routineDate: input.routineDate,
    trajectory: input.profile.trajectory,
    completionRate: input.profile.trajectory.completionRate,
  });

  const weekKey = weekKeyFromDate(input.routineDate);
  const existing = store.getWeeklyRhythm(input.childId, weekKey);
  const prevAvg = existing?.avgCompletionRate ?? input.profile.trajectory.completionRate;
  const nextAvg = Math.round(((prevAvg + input.profile.trajectory.completionRate) / 2) * 100) / 100;

  store.upsertWeeklyRhythm({
    childId: input.childId,
    weekKey,
    avgCompletionRate: nextAvg,
    dominantCategories: input.profile.memory.preferredCategories,
    calmEveningRate: input.profile.predictiveHints.suggestCalmEvening ? 0.7 : 0.4,
  });

  const trustScore = trustScoreFromSignals({
    trajectory: input.profile.trajectory,
    diagnostics: input.productionDiagnostics,
    hints: input.profile.predictiveHints,
  });

  const profile: FamilyIntelligenceProfile = {
    ...input.profile,
    trustScore,
  };

  const insights = generateFamilyInsights({
    trajectory: profile.trajectory,
    hints: profile.predictiveHints,
    memory: profile.memory,
    seed: input.childId.length + input.routineDate.length,
  });

  void input.items;
  void input.adaptiveCompletion;
  void input.emotionalProfile;

  return {
    profile,
    insights,
    platformReadiness: "family_intelligence_active",
  };
}

/**
 * Build profile only (analytics / tests) without mutating pipeline context.
 */
export function buildFamilyIntelligenceProfile(
  input: FamilyIntelligencePrepareInput,
): FamilyIntelligenceProfile | null {
  return prepareFamilyIntelligenceInput(input).profile;
}
