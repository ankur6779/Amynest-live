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

export type ExperimentStatus = "running" | "completed" | "paused" | "cancelled";

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
  status: ExperimentStatus;
  createdAt: string;
  updatedAt: string;
};

export type AlertWorkflowStatus = "open" | "acknowledged" | "resolved" | "ignored";

export type GrowthOsAlertWorkflow = {
  id: string;
  alertId: string;
  priority: "critical" | "warning" | "info";
  title: string;
  description: string;
  rootCause: string | null;
  suggestedFix: string | null;
  owner: string | null;
  status: AlertWorkflowStatus;
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

export type GrowthOsPayload = {
  decisions: GrowthOsDecision[];
  experiments: GrowthOsExperiment[];
  alertWorkflows: GrowthOsAlertWorkflow[];
  actionHistory: GrowthOsActionLog[];
  settings: GrowthOsSettings;
};

export const DEFAULT_GROWTH_OS_SETTINGS: GrowthOsSettings = {
  crashThresholdPct: 97,
  growthScoreWarning: 65,
  retentionD1TargetPct: 10,
  alertRulesEnabled: true,
  predictionMomentumDays: 30,
  futureAutomationEnabled: false,
};

export const EMPTY_GROWTH_OS_PAYLOAD: GrowthOsPayload = {
  decisions: [],
  experiments: [],
  alertWorkflows: [],
  actionHistory: [],
  settings: DEFAULT_GROWTH_OS_SETTINGS,
};
