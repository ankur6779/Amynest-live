import { isCoreRoute } from "./route-risk-heatmap.js";
import type {
  ChangedFileAnalysis,
  ImpactedFingerprint,
  RegressionCoverageReport,
  ReleaseVerdict,
  RouteRiskEntry,
} from "./types.js";

export type ReleaseRiskInput = {
  releaseRiskScore: number;
  changedFiles: ChangedFileAnalysis[];
  impactedFingerprints: ImpactedFingerprint[];
  regressionCoverage: RegressionCoverageReport;
  routeHeatmap: RouteRiskEntry[];
  testsRun: boolean;
};

export type ReleaseRiskOutput = {
  verdict: ReleaseVerdict;
  recommendedBlockers: string[];
  warnings: string[];
  highRiskAreas: string[];
  requiredManualTesting: string[];
};

export function detectReleaseRisk(input: ReleaseRiskInput): ReleaseRiskOutput {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const highRiskAreas: string[] = [];
  const requiredManualTesting: string[] = [];

  const p0Impacted = input.impactedFingerprints.filter((f) => f.severity === "P0");

  for (const fp of p0Impacted) {
    if (fp.regressionStatus === "missing") {
      blockers.push(
        `P0 fingerprint ${fp.readableFingerprint} source modified — regression tests missing`,
      );
    } else if (!fp.testsExist) {
      blockers.push(
        `P0 fingerprint ${fp.readableFingerprint} — regression test files not found on disk`,
      );
    } else if (input.testsRun && !fp.testsPassed) {
      blockers.push(
        `P0 fingerprint ${fp.readableFingerprint} — regression tests failed`,
      );
    } else if (!input.testsRun) {
      warnings.push(
        `P0 fingerprint ${fp.readableFingerprint} impacted — run regression tests before deploy`,
      );
    }
    highRiskAreas.push(`${fp.readableFingerprint} (${fp.components.join(", ")})`);
    requiredManualTesting.push(
      `Manual test: ${fp.readableFingerprint} on ${fp.changedFiles[0] ?? "mapped routes"}`,
    );
  }

  const modifiedCoreRoutes = input.routeHeatmap.filter(
    (r) => r.modifiedInRelease && isCoreRoute(r.route),
  );

  for (const route of modifiedCoreRoutes) {
    const hasRouteTests = input.impactedFingerprints.some(
      (f) => f.tests.length > 0 && f.testsExist,
    );
    if (!hasRouteTests && input.testsRun === false) {
      warnings.push(
        `Core route ${route.route} modified — no route regression tests executed`,
      );
    }
    if (route.p0Incidents > 0) {
      highRiskAreas.push(`Route ${route.route} (${route.p0Incidents} historic P0 incidents)`);
      requiredManualTesting.push(`Smoke test core flow: ${route.route}`);
    }
  }

  const criticalFiles = input.changedFiles.filter(
    (f) => f.riskLevel === "CRITICAL" || f.riskLevel === "HIGH",
  );
  for (const file of criticalFiles) {
    highRiskAreas.push(`${file.path} (risk ${file.riskScore}, ${file.riskLevel})`);
  }

  for (const fp of input.impactedFingerprints.filter((f) => f.severity === "P1")) {
    warnings.push(`P1 fingerprint potentially impacted: ${fp.readableFingerprint}`);
    requiredManualTesting.push(`Verify: ${fp.readableFingerprint}`);
  }

  if (input.regressionCoverage.gaps.length > 0 && blockers.length === 0) {
    for (const gap of input.regressionCoverage.gaps.slice(0, 5)) {
      warnings.push(gap);
    }
  }

  let verdict: ReleaseVerdict = "PASS";

  if (blockers.length > 0) {
    verdict = "BLOCK";
  } else if (
    p0Impacted.length > 0 ||
    input.releaseRiskScore >= 60 ||
    criticalFiles.length > 0
  ) {
    verdict = "HIGH_RISK";
  } else if (
    input.releaseRiskScore >= 35 ||
    warnings.length > 0 ||
    input.impactedFingerprints.length > 0
  ) {
    verdict = "WARNING";
  }

  return {
    verdict,
    recommendedBlockers: blockers,
    warnings,
    highRiskAreas: [...new Set(highRiskAreas)],
    requiredManualTesting: [...new Set(requiredManualTesting)],
  };
}
