import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeAllChangedFiles,
  computeReleaseRiskScore,
} from "./change-risk-analyzer.js";
import { collectGitChanges, inferChangedComponentsAndHooks } from "./git-change-analyzer.js";
import { findImpactedFingerprints } from "./fingerprint-impact-map.js";
import { validateRegressionCoverage } from "./regression-coverage-validator.js";
import {
  augmentRouteHeatmapFromDb,
  buildRouteRiskHeatmap,
} from "./route-risk-heatmap.js";
import { detectReleaseRisk } from "./release-risk-detector.js";
import { buildReleaseReviewMarkdown } from "./review-package.js";
import type { ReleaseIntelligenceReport } from "./types.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const REVIEW_DIR = join(REPO_ROOT, "artifacts/release-review");

export type AnalyzeReleaseOptions = {
  base?: string;
  head?: string;
  version?: string;
  runTests?: boolean;
  writeArtifacts?: boolean;
};

export async function analyzeRelease(
  options: AnalyzeReleaseOptions = {},
): Promise<ReleaseIntelligenceReport> {
  const git = collectGitChanges({ base: options.base, head: options.head });
  const changedPaths = git.files.map((f) => f.path);
  const changedFiles = analyzeAllChangedFiles(git.files);
  const releaseRiskScore = computeReleaseRiskScore(changedFiles);

  const impactedEntries = findImpactedFingerprints(changedPaths);
  const { fingerprints: impactedFingerprints, report: regressionCoverage } =
    validateRegressionCoverage(impactedEntries, {
      runTests: options.runTests ?? false,
    });

  const inferred = inferChangedComponentsAndHooks(changedPaths);
  let routeHeatmap = buildRouteRiskHeatmap({
    changedFiles: changedPaths,
    changedRoutes: inferred.routes,
  });
  routeHeatmap = await augmentRouteHeatmapFromDb(routeHeatmap);

  const risk = detectReleaseRisk({
    releaseRiskScore,
    changedFiles,
    impactedFingerprints,
    regressionCoverage,
    routeHeatmap,
    testsRun: options.runTests ?? false,
  });

  const version =
    options.version ??
    process.env.RELEASE_VERSION ??
    process.env.GITHUB_SHA?.slice(0, 8) ??
    git.headRef;

  const core: Omit<ReleaseIntelligenceReport, "markdown"> = {
    generatedAt: new Date().toISOString(),
    version,
    baseRef: git.baseRef,
    headRef: git.headRef,
    verdict: risk.verdict,
    releaseRiskScore,
    changedFiles,
    impactedFingerprints,
    routeHeatmap,
    regressionCoverage,
    highRiskAreas: risk.highRiskAreas,
    requiredManualTesting: risk.requiredManualTesting,
    recommendedBlockers: risk.recommendedBlockers,
    warnings: risk.warnings,
  };

  const report: ReleaseIntelligenceReport = {
    ...core,
    markdown: buildReleaseReviewMarkdown(core),
  };

  if (options.writeArtifacts !== false) {
    mkdirSync(REVIEW_DIR, { recursive: true });
    const mdPath = join(REVIEW_DIR, `${version}.md`);
    const jsonPath = join(REVIEW_DIR, "latest.json");
    writeFileSync(mdPath, report.markdown, "utf8");
    writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          verdict: report.verdict,
          releaseRiskScore: report.releaseRiskScore,
          version: report.version,
          generatedAt: report.generatedAt,
          recommendedBlockers: report.recommendedBlockers,
          impactedFingerprints: report.impactedFingerprints.map(
            (f) => f.readableFingerprint,
          ),
          highRiskAreas: report.highRiskAreas,
        },
        null,
        2,
      ),
      "utf8",
    );
  }

  return report;
}

/** Offline simulation for CI docs / tests without git changes. */
export async function analyzeSimulatedRelease(input: {
  files: Array<{ path: string; insertions: number; deletions: number }>;
  version?: string;
  runTests?: boolean;
}): Promise<ReleaseIntelligenceReport> {
  const changedPaths = input.files.map((f) => f.path);
  const changedFiles = analyzeAllChangedFiles(input.files);
  const releaseRiskScore = computeReleaseRiskScore(changedFiles);

  const impactedEntries = findImpactedFingerprints(changedPaths);
  const { fingerprints: impactedFingerprints, report: regressionCoverage } =
    validateRegressionCoverage(impactedEntries, {
      runTests: input.runTests ?? false,
    });

  const inferred = inferChangedComponentsAndHooks(changedPaths);
  let routeHeatmap = buildRouteRiskHeatmap({
    changedFiles: changedPaths,
    changedRoutes: inferred.routes,
  });
  routeHeatmap = await augmentRouteHeatmapFromDb(routeHeatmap);

  const risk = detectReleaseRisk({
    releaseRiskScore,
    changedFiles,
    impactedFingerprints,
    regressionCoverage,
    routeHeatmap,
    testsRun: input.runTests ?? false,
  });

  const version = input.version ?? "simulate";

  const core: Omit<ReleaseIntelligenceReport, "markdown"> = {
    generatedAt: new Date().toISOString(),
    version,
    baseRef: "simulate",
    headRef: "simulate",
    verdict: risk.verdict,
    releaseRiskScore,
    changedFiles,
    impactedFingerprints,
    routeHeatmap,
    regressionCoverage,
    highRiskAreas: risk.highRiskAreas,
    requiredManualTesting: risk.requiredManualTesting,
    recommendedBlockers: risk.recommendedBlockers,
    warnings: risk.warnings,
  };

  const report: ReleaseIntelligenceReport = {
    ...core,
    markdown: buildReleaseReviewMarkdown(core),
  };

  mkdirSync(REVIEW_DIR, { recursive: true });
  writeFileSync(join(REVIEW_DIR, `${version}.md`), report.markdown, "utf8");
  writeFileSync(
    join(REVIEW_DIR, "latest.json"),
    JSON.stringify(
      {
        verdict: report.verdict,
        releaseRiskScore: report.releaseRiskScore,
        version: report.version,
        generatedAt: report.generatedAt,
        recommendedBlockers: report.recommendedBlockers,
        impactedFingerprints: report.impactedFingerprints.map(
          (f) => f.readableFingerprint,
        ),
        highRiskAreas: report.highRiskAreas,
      },
      null,
      2,
    ),
    "utf8",
  );

  return report;
}
