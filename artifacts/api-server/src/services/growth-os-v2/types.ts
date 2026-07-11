import type { GrowthObservatoryPayload } from "../growth-observatory/types.js";

export type EvidenceStatus = "verified" | "not_enough_evidence" | "not_verified";

export type MetricChange = {
  id: string;
  metric: string;
  label: string;
  category: "acquisition" | "activation" | "retention" | "revenue" | "reliability";
  current: number | null;
  baseline7d: number | null;
  baseline30d: number | null;
  changeVsYesterdayPct: number | null;
  changeVs7dPct: number | null;
  changeVs30dPct: number | null;
  direction: "up" | "down" | "flat";
  meaningful: boolean;
  affectedUsers: number;
  evidence: string;
  status: EvidenceStatus;
};

export type CorrelationLink = {
  metric: string;
  label: string;
  value: number | null;
  changePct: number | null;
  direction: "up" | "down" | "flat" | "unchanged";
};

export type EvidenceChain = {
  id: string;
  triggerMetric: string;
  triggerLabel: string;
  hypothesis: string;
  chain: CorrelationLink[];
  confidence: number;
  status: EvidenceStatus;
  recommendedInvestigation: string | null;
};

export type ScoredOpportunity = {
  id: string;
  title: string;
  category: "growth" | "revenue" | "retention" | "technical";
  evidence: string;
  affectedUsers: number;
  priorityScore: number;
  scores: {
    businessImpact: number;
    confidence: number;
    effort: number;
    revenueImpact: number;
    retentionImpact: number;
    activationImpact: number;
    technicalRisk: number;
  };
  estimatedImpact: string;
  engineeringEffort: "S" | "M" | "L";
  confidenceLabel: "high" | "medium" | "low";
  status: EvidenceStatus;
};

export type DeployRegression = {
  id: string;
  releaseVersion: string;
  releaseAt: string;
  metric: string;
  label: string;
  beforeValue: number | null;
  afterValue: number | null;
  changePct: number | null;
  exceedsThreshold: boolean;
  category: "conversion" | "performance" | "retention" | "revenue" | "startup" | "experiment";
  evidence: string;
  status: EvidenceStatus;
};

export type ExperimentDecision = {
  id: string;
  name: string;
  featureFlag: string | null;
  sampleSize: { control: number; variant: number };
  primaryMetric: string;
  confidencePct: number | null;
  winningVariant: string | null;
  decision: "too_early" | "continue" | "ship" | "rollback" | "not_enough_evidence";
  recommendedAction: string;
  status: EvidenceStatus;
};

export type FounderAction = {
  id: string;
  priority: number;
  priorityLabel: "critical" | "high" | "medium" | "low";
  problem: string;
  evidence: string;
  businessImpact: string;
  confidence: number;
  confidenceLabel: "high" | "medium" | "low";
  engineeringEffort: "S" | "M" | "L";
  estimatedHours: string;
  recommendedOwner: "founder" | "engineering" | "growth" | "product";
  sourceType: "change" | "correlation" | "opportunity" | "regression" | "experiment" | "alert";
  sourceId: string;
  status: EvidenceStatus;
  metricRefs: string[];
};

export type WeeklyExecutiveReview = {
  weekEnding: string;
  topWins: string[];
  topRegressions: string[];
  revenueSummary: string;
  retentionSummary: string;
  activationSummary: string;
  reliabilitySummary: string;
  experiments: Array<{ name: string; decision: string; evidence: string }>;
  upcomingRisks: string[];
  recommendations: string[];
  status: EvidenceStatus;
};

export type KnowledgeBaseEntry = {
  id: string;
  at: string;
  type: "incident" | "experiment_success" | "experiment_failure" | "regression" | "deployment";
  title: string;
  summary: string;
  evidence: string;
  outcome: string | null;
  tags: string[];
};

export type GrowthOperationsPayload = {
  generatedAt: string;
  timeRange: GrowthObservatoryPayload["timeRange"];
  changes: MetricChange[];
  correlations: EvidenceChain[];
  opportunities: ScoredOpportunity[];
  regressions: DeployRegression[];
  experiments: ExperimentDecision[];
  actionQueue: FounderAction[];
  weeklyReview: WeeklyExecutiveReview;
  knowledgeBase: KnowledgeBaseEntry[];
  dataQuality: {
    gaps: string[];
    sampleWarnings: string[];
  };
};
