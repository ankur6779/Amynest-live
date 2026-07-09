import type {
  ExecutiveIntelligence,
  FeatureImpact,
  GrowthDashboardData,
  GrowthTimePreset,
  Predictions,
  Recommendation,
} from "./types";

export type GosNavSection =
  | "overview"
  | "executive"
  | "acquisition"
  | "activation"
  | "retention"
  | "revenue"
  | "campaigns"
  | "experiments"
  | "intelligence"
  | "recommendations"
  | "alerts"
  | "predictions"
  | "settings"
  | "pre-signup";

export type IntelligenceTab =
  | "insights"
  | "journey"
  | "cohorts"
  | "calendar"
  | "attribution"
  | "feature-impact";

export type DecisionStatus = "pending" | "approved" | "rejected" | "executed";

export type GrowthOsDecision = {
  id: string;
  recommendationId: string;
  title: string;
  description: string;
  priority: "critical" | "high" | "medium" | "low";
  estimatedImpact: number;
  confidence: number;
  reason: string;
  affectedUsers: number;
  expectedRevenueImpact: number | null;
  suggestedAction: string;
  category: string;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  decisionReason: string | null;
};

export type GrowthOsExperiment = {
  id: string;
  name: string;
  feature: string;
  startDate: string;
  endDate: string | null;
  variantA: string;
  variantB: string;
  usersA: number;
  usersB: number;
  winner: string | null;
  confidence: number | null;
  businessImpact: number | null;
  status: "running" | "completed" | "paused" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type GrowthOsAlertWorkflow = {
  id: string;
  alertId: string;
  priority: "critical" | "warning" | "info";
  title: string;
  description: string;
  rootCause: string | null;
  suggestedFix: string | null;
  owner: string | null;
  status: "open" | "acknowledged" | "resolved" | "ignored";
  createdAt: string;
  updatedAt: string;
  history: Array<{ at: string; by: string | null; action: string; note: string | null }>;
};

export type GrowthOsActionLog = {
  id: string;
  at: string;
  userId: string;
  action: string;
  reason: string | null;
  outcome: string | null;
  entityType: "decision" | "alert" | "experiment" | "settings";
  entityId: string;
};

export type GrowthOsSettings = {
  crashThresholdPct: number;
  growthScoreWarning: number;
  retentionD1TargetPct: number;
  alertRulesEnabled: boolean;
  predictionMomentumDays: number;
  futureAutomationEnabled: boolean;
};

export type GosSectionResponse<T = unknown> = {
  ok: boolean;
  section: string;
  generatedAt: string;
  timeRange: GrowthDashboardData["timeRange"];
  data: T;
};

export type CampaignHubRow = {
  campaign: string;
  platform: string | null;
  status: string;
  spend: number | null;
  cpi: number | null;
  ctr: number | null;
  installs: number;
  signups: number;
  routinePct: number | null;
  trialPct: number | null;
  subscriptionPct: number | null;
  paidSubscribers: number;
  revenue: number | null;
  roas: number | null;
  ltv: number | null;
  cac: number | null;
  integrationNote: string | null;
};

export type AttributionStage = {
  key: string;
  label: string;
  users: number;
  conversionPct: number | null;
  dropPct: number | null;
};

export type JourneyStep = { step: string; users: number; pct: number | null };

export type CohortExplorerRow = {
  cohort: string;
  cohortSize: number;
  d1: number | null;
  d7: number | null;
  d30: number | null;
  subscriptionRate: number | null;
  revenueUsers: number;
};

export type GrowthCalendarEvent = {
  id: string;
  timestamp: string;
  category: string;
  title: string;
  detail: string;
};

export type FeatureImpactLabRow = {
  key: string;
  label: string;
  dau: number;
  wau: number;
  mau: number;
  avgSessionSec: number | null;
  repeatUsagePct: number | null;
  trialCorrelationPct: number | null;
  subscriptionCorrelationPct: number | null;
  retentionCorrelationPct: number | null;
  revenueContribution: number;
  rank: number;
  businessImpactScore: number;
};

export type PredictionV2Horizon = {
  days: number;
  confidencePct: number;
  revenue: number | null;
  mrr: number | null;
  arr: number | null;
  trials: number | null;
  subscriptions: number | null;
  retentionD7: number | null;
  installs: number | null;
};

export type CopilotResponse = {
  question: string;
  answer: string;
  confidence: number;
  sources: string[];
  integrationStatus: "architecture_ready";
};

export const GOS_NAV: Array<{ id: GosNavSection; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "executive", label: "Executive" },
  { id: "acquisition", label: "Acquisition" },
  { id: "activation", label: "Activation" },
  { id: "retention", label: "Retention" },
  { id: "revenue", label: "Revenue" },
  { id: "campaigns", label: "Campaigns" },
  { id: "pre-signup", label: "Pre-Signup" },
  { id: "experiments", label: "Experiments" },
  { id: "intelligence", label: "Intelligence" },
  { id: "recommendations", label: "Recommendations" },
  { id: "alerts", label: "Alerts" },
  { id: "predictions", label: "Predictions" },
  { id: "settings", label: "Settings" },
];

export const INTELLIGENCE_TABS: Array<{ id: IntelligenceTab; label: string; apiSection: string }> = [
  { id: "insights", label: "Insights", apiSection: "intelligence" },
  { id: "journey", label: "Journey", apiSection: "journey" },
  { id: "cohorts", label: "Cohorts", apiSection: "cohorts" },
  { id: "calendar", label: "Calendar", apiSection: "calendar" },
  { id: "attribution", label: "Attribution", apiSection: "attribution" },
  { id: "feature-impact", label: "Feature Impact", apiSection: "feature-impact" },
];

export type ExecutiveSectionData = { dashboard: GrowthDashboardData; section: string };
export type IntelligenceSectionData = {
  amyInsights: ExecutiveIntelligence["amyInsights"];
  rootCauses: ExecutiveIntelligence["rootCauses"];
  insights: GrowthDashboardData["insights"];
};
export type DecisionsSectionData = {
  decisions: GrowthOsDecision[];
  actionHistory: GrowthOsActionLog[];
};
export type PredictionsSectionData = {
  v1: Predictions;
  v2: { label: string; horizons: PredictionV2Horizon[] };
};

export function buildGosQuery(
  section: string,
  preset: GrowthTimePreset,
  start: string,
  end: string,
  extra?: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams({ preset });
  if (preset === "custom") {
    if (start) params.set("start", start);
    if (end) params.set("end", end);
  }
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v);
    }
  }
  return `/api/admin/growth/gos/${section}?${params.toString()}`;
}

export function buildDashboardQuery(preset: GrowthTimePreset, start: string, end: string): string {
  const params = new URLSearchParams({ preset });
  if (preset === "custom") {
    if (start) params.set("start", start);
    if (end) params.set("end", end);
  }
  return `/api/admin/growth/dashboard?${params.toString()}`;
}
