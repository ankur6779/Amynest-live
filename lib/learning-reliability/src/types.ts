/**
 * Amy Learning Platform reliability — chaos, heal, verify, report.
 */

export const LEARNING_RELIABILITY_SCHEMA_VERSION = 1 as const;

export type DataLossRisk = "none" | "low" | "medium" | "high";

export type FailureKind =
  | "app_kill"
  | "browser_refresh"
  | "tab_crash"
  | "storage_corruption"
  | "partial_writes"
  | "duplicate_events"
  | "missing_events"
  | "delayed_events"
  | "offline_hours"
  | "reconnect_storms"
  | "low_memory"
  | "slow_cpu"
  | "battery_saver"
  | "audio_interruption"
  | "route_interruption";

export type VerifyDomain =
  | "knowledge_graph"
  | "skill_registry"
  | "learning_runtime"
  | "event_ordering"
  | "offline_queue"
  | "decision_replay"
  | "recommendation_stability"
  | "cloud_reconciliation";

export type RepairActionLog = {
  reason: string;
  actions: string[];
  durationMs: number;
  dataLossRisk: DataLossRisk;
  at: string;
};

export type ScenarioStatus = "pass" | "fail" | "warn" | "healed";

export type ScenarioResult = {
  id: FailureKind;
  title: string;
  status: ScenarioStatus;
  durationMs: number;
  repairs: RepairActionLog[];
  checks: Array<{
    domain: VerifyDomain;
    ok: boolean;
    detail: string;
  }>;
  notes: string[];
  suggestedFixes: string[];
};

export type FailureMatrixRow = {
  failure: FailureKind;
  status: ScenarioStatus;
  recovered: boolean;
  dataLossRisk: DataLossRisk;
  domainsFailed: VerifyDomain[];
};

export type ReliabilityReport = {
  schemaVersion: typeof LEARNING_RELIABILITY_SCHEMA_VERSION;
  generatedAt: string;
  reliabilityScore: number;
  scenarios: ScenarioResult[];
  failureMatrix: FailureMatrixRow[];
  recoveryReport: {
    totalRepairs: number;
    highRiskRepairs: number;
    averageRepairMs: number;
    actions: RepairActionLog[];
  };
  suggestedFixes: string[];
  cloudReconciliationReady: boolean;
  summary: string;
};

export type ChaosContext = {
  seed: number;
  nowMs: number;
  childId: string;
};
