import type { TrendValue } from "../growth-dashboard/types.js";

export type EvidenceClass = "measured" | "estimated" | "not_verified";

export type FinancialMetric = {
  key: string;
  label: string;
  value: number | null;
  previous: number | null;
  changePct: number | null;
  unit: "inr" | "pct" | "count" | "days";
  evidenceClass: EvidenceClass;
  evidence: string;
  note: string | null;
};

export type SubscriptionFunnelStage = {
  key: string;
  label: string;
  users: number;
  conversionPct: number | null;
  dropPct: number | null;
  available: boolean;
  evidence: string;
};

export type CohortEconomicsRow = {
  cohort: string;
  dimension: "plan" | "country" | "platform" | "trial" | "acquisition" | "child_age";
  users: number;
  ltv: number | null;
  retentionD7: number | null;
  revenue: number | null;
  renewalRate: number | null;
  churnRate: number | null;
  paybackDays: number | null;
  evidenceClass: EvidenceClass;
  note: string | null;
};

export type FeatureRevenueAttribution = {
  feature: string;
  label: string;
  usersBeforePurchase: number;
  purchaseCorrelationPct: number | null;
  trialCorrelationPct: number | null;
  rank: number;
  evidenceClass: EvidenceClass;
  disclaimer: string;
};

export type ChurnRiskUser = {
  segment: string;
  users: number;
  riskScore: number;
  confidencePct: number;
  signals: string[];
  status: EvidenceClass;
};

export type PricingExperimentAttribution = {
  id: string;
  name: string;
  featureFlag: string | null;
  revenueImpact: string | null;
  conversionImpact: string | null;
  retentionImpact: string | null;
  confidencePct: number | null;
  decision: "continue" | "ship" | "rollback" | "too_early" | "not_enough_evidence";
  evidence: string;
};

export type FounderFinanceBrief = {
  date: string;
  revenueSummary: string;
  mrrTrend: string;
  topRevenueDrivers: string[];
  topRisks: string[];
  expectedRenewals: string;
  expectedChurn: string;
  recommendedActions: string[];
  projectedMrr30d: { value: number | null; low: number | null; high: number | null; status: EvidenceClass };
};

export type RevenueIntelligencePayload = {
  generatedAt: string;
  timeRange: { startIso: string; endIso: string; label: string };
  financialKpis: FinancialMetric[];
  subscriptionFunnel: SubscriptionFunnelStage[];
  cohortEconomics: CohortEconomicsRow[];
  featureAttribution: FeatureRevenueAttribution[];
  churnIntelligence: {
    renewalRisk: ChurnRiskUser[];
    trialConversionLikely: ChurnRiskUser[];
    subscribersAtRisk: ChurnRiskUser[];
    paymentFailures: number;
    inactiveSubscribers: number;
  };
  experimentAttribution: PricingExperimentAttribution[];
  financeBrief: FounderFinanceBrief;
  dataGaps: string[];
};

export type TrendValueMap = Record<string, TrendValue>;
