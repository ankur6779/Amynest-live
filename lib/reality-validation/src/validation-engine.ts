import type {
  FamilyStrategyProfile,
  InterventionLedgerEntry,
  RealityDashboardView,
  ValidatedMemoryUpdate,
} from "./types.js";
import {
  outcomeMetricsFromSignals,
  scoreInterventionImpact,
} from "./before-after.js";
import { estimateOutcomeHalfLife } from "./half-life.js";
import {
  buildSelfCorrectionRules,
  inferFamilyPreferences,
  rankFailedInterventions,
  rankInterventions,
} from "./ranking.js";
import { computeGlobalBenchmarks } from "./benchmarks.js";

export interface ValidateInterventionInput {
  ledgerId: string;
  userId: string;
  childId: number | null;
  interventionId: string;
  interventionType: string;
  surface: InterventionLedgerEntry["surface"];
  recommendationTitle: string;
  recommendationKey: string;
  dispatchedAt: string;
  actionAt: string | null;
  baselineSignals: {
    routineCompletionRate7d?: number;
    lessonsCompleted7d?: number;
    currentStreakDays?: number;
    sessionsLast7d?: number;
    healthScore?: number;
  };
  followUpSignals: {
    routineCompletionRate7d?: number;
    lessonsCompleted7d?: number;
    currentStreakDays?: number;
    sessionsLast7d?: number;
    healthScore?: number;
  };
  experimentId?: string | null;
  experimentVariant?: string | null;
}

export function validateIntervention(
  input: ValidateInterventionInput,
): InterventionLedgerEntry {
  const baseline = outcomeMetricsFromSignals(input.baselineSignals);
  const followUp = outcomeMetricsFromSignals(input.followUpSignals);
  const { scorecard, confidence, summary } = scoreInterventionImpact(
    baseline,
    followUp,
    input.interventionType,
  );

  const metricDeltas = {
    routineCompletionRate7d: followUp.routineCompletionRate7d - baseline.routineCompletionRate7d,
    learningSuccess7d: followUp.learningSuccess7d - baseline.learningSuccess7d,
    streakDays: followUp.streakDays - baseline.streakDays,
    sessionsLast7d: followUp.sessionsLast7d - baseline.sessionsLast7d,
    healthScore: followUp.healthScore - baseline.healthScore,
    childEngagement: followUp.childEngagement - baseline.childEngagement,
  };

  return {
    ledgerId: input.ledgerId,
    userId: input.userId,
    childId: input.childId,
    interventionId: input.interventionId,
    interventionType: input.interventionType,
    surface: input.surface,
    recommendationTitle: input.recommendationTitle,
    recommendationKey: input.recommendationKey,
    dispatchedAt: input.dispatchedAt,
    actionAt: input.actionAt,
    validatedAt: new Date().toISOString(),
    scorecard,
    confidenceScore: confidence,
    baselineMetrics: baseline,
    followUpMetrics: followUp,
    metricDeltas,
    experimentId: input.experimentId ?? null,
    experimentVariant: input.experimentVariant ?? null,
    halfLifeDays: null,
    evidenceSummary: summary,
  };
}

export function buildStrategyProfile(
  userId: string,
  ledger: InterventionLedgerEntry[],
  benchmarkInput: {
    routineCompletionRate7d: number;
    learningSuccess7d: number;
    accountAgeDays: number;
    childCount: number;
  },
): FamilyStrategyProfile {
  const effective = rankInterventions(ledger);
  const ineffective = rankFailedInterventions(ledger);

  for (const e of effective) {
    const halfLife = estimateOutcomeHalfLife(ledger, e.key);
    const entry = ledger.find((l) => l.recommendationKey === e.key);
    if (entry) entry.halfLifeDays = halfLife;
  }

  const benchmarks = computeGlobalBenchmarks(benchmarkInput);

  return {
    userId,
    effectiveInterventions: effective,
    ineffectiveInterventions: ineffective,
    preferences: inferFamilyPreferences(effective),
    globalBenchmarks: {
      routinePercentile: benchmarks.routinePercentile,
      learningPercentile: benchmarks.learningPercentile,
      cohortLabel: benchmarks.cohortLabel,
    },
    selfCorrectionRules: buildSelfCorrectionRules(ineffective),
    updatedAt: new Date().toISOString(),
  };
}

export function buildRealityDashboard(
  ledger: InterventionLedgerEntry[],
  profile: FamilyStrategyProfile | null,
): RealityDashboardView {
  const validated = ledger.filter((e) => e.scorecard !== "pending_validation");
  const worked = validated.filter(
    (e) => e.scorecard === "success" || e.scorecard === "partial_success",
  );
  const failed = validated.filter(
    (e) => e.scorecard === "no_impact" || e.scorecard === "negative_impact",
  );

  return {
    recommendationsMade: ledger.length,
    actionsCompleted: ledger.filter((e) => e.actionAt).length,
    outcomesImproved: worked.length,
    interventionsWorked: worked.length,
    interventionsFailed: failed.length,
    topEffective: profile?.effectiveInterventions.slice(0, 5) ?? [],
    topFailed: profile?.ineffectiveInterventions.slice(0, 5) ?? [],
    recentValidations: validated
      .slice(0, 8)
      .map((e) => ({
        title: e.recommendationTitle,
        scorecard: e.scorecard,
        deltaSummary: e.evidenceSummary,
        confidence: e.confidenceScore,
      })),
    amyEvidenceAvailable: validated.length >= 2,
  };
}

export function toValidatedMemoryUpdate(
  entry: InterventionLedgerEntry,
  sampleSize: number,
): ValidatedMemoryUpdate | null {
  if (entry.scorecard === "pending_validation") return null;

  const outcome =
    entry.scorecard === "success" || entry.scorecard === "partial_success"
      ? "positive"
      : entry.scorecard === "negative_impact"
        ? "negative"
        : "neutral";

  return {
    category: entry.surface === "notification" ? "notification" : "intervention",
    key: entry.recommendationKey,
    outcome,
    context: entry.evidenceSummary,
    confidenceScore: entry.confidenceScore,
    sampleSize,
    validatedAt: entry.validatedAt ?? new Date().toISOString(),
  };
}

export function recordRecommendationDispatched(
  params: Omit<ValidateInterventionInput, "followUpSignals" | "baselineSignals"> & {
    baselineSignals: ValidateInterventionInput["baselineSignals"];
  },
): InterventionLedgerEntry {
  const baseline = outcomeMetricsFromSignals(params.baselineSignals);
  return {
    ledgerId: params.ledgerId,
    userId: params.userId,
    childId: params.childId,
    interventionId: params.interventionId,
    interventionType: params.interventionType,
    surface: params.surface,
    recommendationTitle: params.recommendationTitle,
    recommendationKey: params.recommendationKey,
    dispatchedAt: params.dispatchedAt,
    actionAt: params.actionAt,
    validatedAt: null,
    scorecard: "pending_validation",
    confidenceScore: 0,
    baselineMetrics: baseline,
    followUpMetrics: null,
    metricDeltas: null,
    experimentId: params.experimentId ?? null,
    experimentVariant: params.experimentVariant ?? null,
    halfLifeDays: null,
    evidenceSummary: "Awaiting follow-up validation",
  };
}

export function recordRecommendationAction(
  entry: InterventionLedgerEntry,
  actionAt: string,
): InterventionLedgerEntry {
  return { ...entry, actionAt };
}
