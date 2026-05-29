/** Intervention effectiveness scorecard — did real-world outcomes improve? */
export type InterventionScorecard =
  | "success"
  | "partial_success"
  | "no_impact"
  | "negative_impact"
  | "pending_validation";

export type InterventionSurface =
  | "notification"
  | "amy_ai"
  | "parent_hub"
  | "campaign"
  | "goal"
  | "intent"
  | "reward"
  | "learning_zone";

export type FamilyResponsePreference =
  | "rewards"
  | "coaching"
  | "streaks"
  | "notifications"
  | "routines"
  | "campaigns";

export interface OutcomeMetrics {
  routineCompletionRate7d: number;
  learningSuccess7d: number;
  streakDays: number;
  sessionsLast7d: number;
  healthScore: number;
  childEngagement: number;
}

export interface MetricDelta {
  routineCompletionRate7d: number;
  learningSuccess7d: number;
  streakDays: number;
  sessionsLast7d: number;
  healthScore: number;
  childEngagement: number;
}

export interface InterventionLedgerEntry {
  ledgerId: string;
  userId: string;
  childId: number | null;
  interventionId: string;
  interventionType: string;
  surface: InterventionSurface;
  recommendationTitle: string;
  recommendationKey: string;
  dispatchedAt: string;
  actionAt: string | null;
  validatedAt: string | null;
  scorecard: InterventionScorecard;
  confidenceScore: number;
  baselineMetrics: OutcomeMetrics;
  followUpMetrics: OutcomeMetrics | null;
  metricDeltas: MetricDelta | null;
  experimentId: string | null;
  experimentVariant: string | null;
  halfLifeDays: number | null;
  evidenceSummary: string;
}

export interface ValidatedMemoryUpdate {
  category: "intervention" | "notification" | "learning_style" | "reward_style";
  key: string;
  outcome: "positive" | "neutral" | "negative";
  context: string;
  confidenceScore: number;
  sampleSize: number;
  validatedAt: string;
}

export interface FamilyStrategyProfile {
  userId: string;
  effectiveInterventions: Array<{
    key: string;
    title: string;
    impactScore: number;
    confidence: number;
    responseType: FamilyResponsePreference;
    avgDeltaRoutine: number;
    avgDeltaLearning: number;
  }>;
  ineffectiveInterventions: Array<{
    key: string;
    title: string;
    failureCount: number;
    lastFailedAt: string;
  }>;
  preferences: Partial<Record<FamilyResponsePreference, number>>;
  globalBenchmarks: {
    routinePercentile: number;
    learningPercentile: number;
    cohortLabel: string;
  };
  selfCorrectionRules: Array<{
    interventionKey: string;
    suppressUntil: string | null;
    reason: string;
  }>;
  updatedAt: string;
}

export interface RealityDashboardView {
  recommendationsMade: number;
  actionsCompleted: number;
  outcomesImproved: number;
  interventionsWorked: number;
  interventionsFailed: number;
  topEffective: FamilyStrategyProfile["effectiveInterventions"];
  topFailed: FamilyStrategyProfile["ineffectiveInterventions"];
  recentValidations: Array<{
    title: string;
    scorecard: InterventionScorecard;
    deltaSummary: string;
    confidence: number;
  }>;
  amyEvidenceAvailable: boolean;
}

export interface AmyEvidenceAnswer {
  question: string;
  answer: string;
  evidence: Array<{
    interventionKey: string;
    scorecard: InterventionScorecard;
    delta: string;
    confidence: number;
    validatedAt: string;
  }>;
  confidence: "observation" | "validated" | "experimental";
}

export interface ExperimentArm {
  experimentId: string;
  variant: "control" | "treatment";
  sent: number;
  outcomes: number;
  attributedOutcomes: number;
}

export interface RecommendationChainEvent {
  recommendationId: string;
  recommendationTitle: string;
  actionAt: string | null;
  outcomeAt: string | null;
  validatedAt: string | null;
  scorecard: InterventionScorecard;
}
