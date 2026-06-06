/** Self-healing recovery levels — runtime recovery only, never source mutation. */

export type RecoveryLevel =
  | 1 // component remount
  | 2 // route rebuild
  | 3 // state / form rehydrate
  | 4 // query cache
  | 5 // infinite render + route quarantine
  | 6 // chunk reload
  | 7 // auth token
  | 8; // network queue

export type RecoveryOutcome =
  | "auto_recovered"
  | "partial_recovery"
  | "manual_required"
  | "quarantined";

export type CrashIntelligencePayload = {
  errorId: string;
  fingerprint: string;
  readableFingerprint: string;
  kind: string;
  message: string;
  stack?: string;
  component?: string;
  componentStack?: string;
  route?: string;
  userId?: string | null;
  childId?: string | null;
  browser?: string;
  os?: string;
  appVersion?: string;
  timestamp: string;
  queryKeys?: string[];
  recentActions?: string[];
  recoveryLevel?: RecoveryLevel;
  mitigationApplied?: string | null;
};

export type RecoveryEvent = {
  ts: number;
  level: RecoveryLevel;
  outcome: RecoveryOutcome;
  component?: string;
  route?: string;
  fingerprint?: string;
  detail?: string;
};
