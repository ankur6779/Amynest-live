export type CrashSeverity = "P0" | "P1" | "P2" | "P3";

export type CrashEventIngestPayload = {
  errorId: string;
  fingerprint: string;
  readableFingerprint: string;
  route?: string | null;
  message: string;
  stack?: string | null;
  componentStack?: string | null;
  userId?: string | null;
  childId?: string | null;
  meta?: Record<string, unknown>;
  timestamp?: string;
};

export type FingerprintAggregate = {
  readableFingerprint: string;
  fingerprint: string;
  count24h: number;
  count7d: number;
  affectedUsers: number;
  affectedChildren: number;
  affectedRoutes: string[];
  firstSeen: string;
  lastSeen: string;
  recoverySuccessRate: number;
  severity: CrashSeverity;
  exampleErrorIds: string[];
  coreFlowAffected: boolean;
};

export type RootCauseChain = {
  id: string;
  readableFingerprint: string;
  component: string;
  hook?: string;
  dependency?: string;
  stateMutation?: string;
  chain: string[];
  evidence: string[];
};

export type FixSuggestion = {
  readableFingerprint: string;
  issue: string;
  whyItHappens: string;
  minimalFix: string;
  regressionRisk: "Low" | "Medium" | "High";
  testsRequired: string[];
};

export type CrashRegressionEntry = {
  readableFingerprint: string;
  status: "covered" | "pending" | "resolved";
  testPaths: string[];
  rootCauseId?: string;
};

export type EngineeringAuditReport = {
  generatedAt: string;
  topFingerprints: FingerprintAggregate[];
  entries: Array<{
    aggregate: FingerprintAggregate;
    rootCause: RootCauseChain | null;
    fixSuggestion: FixSuggestion | null;
    regression: CrashRegressionEntry | null;
  }>;
  globalRecoveryRate: number;
  launchGate: LaunchGateResult;
};

export type LaunchGateResult = {
  pass: boolean;
  blockers: string[];
  warnings: string[];
};

export type SourceLocation = {
  file: string;
  line: number;
  endLine?: number;
  functionName: string;
  hook: "useEffect" | "useMemo" | "useCallback" | "useWatch" | "query" | "handler" | "other";
  dependencies?: string[];
  stateMutation?: string;
  queryKey?: string;
  route?: string;
};

export type SourceMapping = {
  readableFingerprint: string;
  component: string;
  route: string;
  locations: SourceLocation[];
};

export type FailureChainNode = {
  id: string;
  kind: "state" | "effect" | "mutation" | "render" | "query" | "navigation" | "retry";
  label: string;
};

export type FailureChainEdge = {
  from: string;
  to: string;
};

export type FailureChainGraph = {
  readableFingerprint: string;
  loopType: "render" | "query" | "reset" | "navigation" | "retry" | "none";
  nodes: FailureChainNode[];
  edges: FailureChainEdge[];
  cycle: string[];
};

export type FixCandidate = {
  readableFingerprint: string;
  issue: string;
  evidence: string[];
  proposedFix: string;
  confidence: number;
  risk: "Low" | "Medium" | "High";
  minimalDiffHint?: string;
};

export type RegressionCandidate = {
  readableFingerprint: string;
  scenarios: Array<{
    name: string;
    description: string;
    suggestedTestFile: string;
    assertions: string[];
  }>;
};

export type CrashHeatmap = {
  generatedAt: string;
  window: "24h" | "7d" | "30d";
  components: Array<{ name: string; count: number }>;
  routes: Array<{ name: string; count: number }>;
  hooks: Array<{ name: string; count: number }>;
  effects: Array<{ name: string; count: number }>;
};

export type NewRegressionFinding = {
  readableFingerprint: string;
  severity: CrashSeverity;
  firstSeenInDeploy: string;
  countSinceDeploy: number;
  triageStatus: "new_regression";
};

export type DeploymentVerification = {
  readableFingerprint: string;
  status: "verified_fixed" | "reopened" | "pending_data";
  baselineCount7d: number;
  currentCount7d: number;
  recoveryRateBefore: number;
  recoveryRateAfter: number;
  relatedFingerprints: string[];
  reason: string;
};

export type EngineeringReviewPackage = {
  readableFingerprint: string;
  generatedAt: string;
  aggregate: FingerprintAggregate | null;
  rootCause: RootCauseChain | null;
  sourceMapping: SourceMapping | null;
  failureChain: FailureChainGraph | null;
  fixCandidate: FixCandidate | null;
  regressionCandidate: RegressionCandidate | null;
  regression: CrashRegressionEntry | null;
  deploymentVerification: DeploymentVerification | null;
  markdown: string;
};
