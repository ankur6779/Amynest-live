export type {
  CrashIntelligencePayload,
  RecoveryEvent,
  RecoveryLevel,
  RecoveryOutcome,
} from "@/lib/self-healing/types";

export { recordSelfHealingAction, getRecentSelfHealingActions } from "@/lib/self-healing/action-log";
export {
  buildReadableFingerprint,
  captureCrashIntelligence,
  getFingerprintCounts,
} from "@/lib/self-healing/crash-intelligence";
export {
  quarantineRoute,
  isRouteQuarantined,
  isPathQuarantined,
  getQuarantinedRoutes,
  clearRouteQuarantine,
} from "@/lib/self-healing/route-quarantine";
export {
  isFeatureMitigated,
  getMitigatedFeatures,
  recordFingerprintSpike,
  resetFeatureMitigationForTests,
} from "@/lib/self-healing/feature-mitigation";
export {
  createSelfHealingQueryClient,
  recoverQueriesForRoute,
  recoverQuery,
  getActiveQueryKeyLabels,
} from "@/lib/self-healing/query-recovery";
export { recoverComponentState, clearCorruptedLocalState } from "@/lib/self-healing/state-recovery";
export { refreshAuthSession, withAuthRecovery } from "@/lib/self-healing/auth-recovery";
export {
  planComponentCrashRecovery,
  recordRecoveryStageComplete,
  type ComponentCrashInput,
  type ComponentCrashPlan,
} from "@/lib/self-healing/orchestrator";
export {
  recordRecoveryEvent,
  getRecoveryEvents,
  getRecoveryStats,
} from "@/lib/self-healing/recovery-stats";
export {
  getSelfHealingDashboardSnapshot,
  type SelfHealingDashboardSnapshot,
} from "@/lib/self-healing/dashboard";
export { installSelfHealingRuntime } from "@/lib/self-healing/install";
