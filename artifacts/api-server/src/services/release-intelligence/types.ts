export type ReleaseVerdict = "PASS" | "WARNING" | "HIGH_RISK" | "BLOCK";

export type ChangedFileAnalysis = {
  path: string;
  insertions: number;
  deletions: number;
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  impactedFingerprints: string[];
  components: string[];
  hooks: string[];
  routes: string[];
  historicalP0Incidents: number;
  riskMultiplier: number;
};

export type ImpactedFingerprint = {
  readableFingerprint: string;
  severity: "P0" | "P1" | "P2";
  changedFiles: string[];
  components: string[];
  hooks: string[];
  tests: string[];
  regressionStatus: "covered" | "pending" | "missing";
  testsExist: boolean;
  testsExecuted: boolean;
  testsPassed: boolean;
};

export type RouteRiskEntry = {
  route: string;
  historicCrashes: number;
  p0Incidents: number;
  affectedUsers: number;
  releaseRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  modifiedInRelease: boolean;
};

export type RegressionCoverageReport = {
  impactedFingerprints: number;
  covered: number;
  pending: number;
  missing: number;
  testsExecuted: number;
  testsPassed: number;
  gaps: string[];
};

export type ReleaseIntelligenceReport = {
  generatedAt: string;
  version: string;
  baseRef: string;
  headRef: string;
  verdict: ReleaseVerdict;
  releaseRiskScore: number;
  changedFiles: ChangedFileAnalysis[];
  impactedFingerprints: ImpactedFingerprint[];
  routeHeatmap: RouteRiskEntry[];
  regressionCoverage: RegressionCoverageReport;
  highRiskAreas: string[];
  requiredManualTesting: string[];
  recommendedBlockers: string[];
  warnings: string[];
  markdown: string;
};
