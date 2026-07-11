import type { GrowthTimeRange, TrendValue } from "../growth-dashboard/types.js";

export type ObservatoryTrend = {
  value: number | null;
  previous: number | null;
  changePct: number | null;
  trend1d: number | null;
  trend7d: number | null;
  trend30d: number | null;
  verified: boolean;
  note: string | null;
};

export type FunnelIntelStage = {
  key: string;
  label: string;
  users: number;
  dropPct: number | null;
  conversionPct: number | null;
  trendVsYesterday: number | null;
  trendVs7d: number | null;
  trendVs30d: number | null;
  available: boolean;
};

export type ExperimentIntel = {
  id: string;
  name: string;
  featureFlag: string | null;
  controlUsers: number;
  variantUsers: number;
  primaryMetric: string;
  primaryMetricControl: number | null;
  primaryMetricVariant: number | null;
  secondaryMetrics: Array<{ key: string; control: number | null; variant: number | null }>;
  confidencePct: number | null;
  winningVariant: "control" | "variant" | "inconclusive" | null;
  recommendedAction: string;
  insufficientSample: boolean;
  verified: boolean;
};

export type CohortIntelRow = {
  segment: string;
  dimension: string;
  users: number;
  d1: number | null;
  d7: number | null;
  routineRate: number | null;
  trialRate: number | null;
  paidRate: number | null;
  verified: boolean;
};

export type ObservatoryAlert = {
  id: string;
  category: "critical" | "warning" | "info";
  metric: string;
  title: string;
  message: string;
  changePct: number | null;
  affectedUsers: number;
  statisticallyMeaningful: boolean;
  evidence: string;
};

export type OpportunityItem = {
  rank: number;
  title: string;
  category: "growth" | "revenue" | "retention" | "technical";
  evidence: string;
  affectedUsers: number;
  estimatedImpact: string;
  engineeringEffort: "S" | "M" | "L";
  confidence: "high" | "medium" | "low";
  verified: boolean;
};

export type PredictionWithCI = {
  metric: string;
  horizonDays: number;
  pointEstimate: number | null;
  low: number | null;
  high: number | null;
  confidencePct: number | null;
  status: "ok" | "not_enough_data";
  method: string;
};

export type HistoricalTrendPoint = {
  day: string;
  value: number;
  ma7: number | null;
  ma30: number | null;
};

export type DailyExecutiveBrief = {
  date: string;
  overallHealthScore: number;
  scores: {
    growth: number;
    retention: number;
    revenue: number;
    reliability: number;
  };
  biggestImprovement: string;
  biggestRegression: string;
  highestPriorityToday: string;
  topRecommendedAction: string;
  blockedItems: string[];
  expectedBusinessImpact: string;
  executiveSummary: string;
};

export type GrowthObservatoryPayload = {
  generatedAt: string;
  timeRange: GrowthTimeRange & {
    startIso: string;
    endIso: string;
  };
  healthScores: {
    overall: number;
    growth: number;
    retention: number;
    revenue: number;
    reliability: number;
  };
  acquisition: Record<string, ObservatoryTrend>;
  activation: {
    metrics: Record<string, ObservatoryTrend>;
    timeToFirstValueMedianMin: number | null;
    timeToFirstValueP95Min: number | null;
  };
  retention: Record<string, ObservatoryTrend>;
  revenue: Record<string, ObservatoryTrend>;
  productHealth: Record<string, ObservatoryTrend>;
  funnel: {
    stages: FunnelIntelStage[];
    largestRegression: FunnelIntelStage | null;
  };
  experiments: ExperimentIntel[];
  cohorts: CohortIntelRow[];
  alerts: ObservatoryAlert[];
  opportunities: {
    growth: OpportunityItem[];
    revenue: OpportunityItem[];
    retention: OpportunityItem[];
    technical: OpportunityItem[];
  };
  predictions: PredictionWithCI[];
  historicalTrends: {
    dau: HistoricalTrendPoint[];
    routines: HistoricalTrendPoint[];
    trials: HistoricalTrendPoint[];
    purchases: HistoricalTrendPoint[];
  };
  dataGaps: string[];
  breakdown: {
    countries: Array<{ country: string; users: number; revenue: number }>;
    platforms: Array<{ platform: string; users: number; sessions: number }>;
  };
};

export type TrendValueMap = Record<string, TrendValue>;
