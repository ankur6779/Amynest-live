import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { analyzeChangedFile, computeReleaseRiskScore } from "../change-risk-analyzer.js";
import { findImpactedFingerprints, filesForFingerprint } from "../fingerprint-impact-map.js";
import { getHistoricalRiskForFile } from "../historical-risk.js";
import { buildRouteRiskHeatmap } from "../route-risk-heatmap.js";
import { detectReleaseRisk } from "../release-risk-detector.js";
import { validateRegressionCoverage } from "../regression-coverage-validator.js";
import { analyzeSimulatedRelease } from "../analyze-release.js";

describe("release intelligence", () => {
  it("maps ChildForm file changes to P0 fingerprints", () => {
    const impacted = findImpactedFingerprints([
      "artifacts/kidschedule/src/pages/children/form.tsx",
    ]);
    const fps = impacted.map((f) => f.readableFingerprint);
    assert.ok(fps.includes("ChildForm|MaximumDepth|InfantEffect"));
    assert.ok(fps.includes("ChildForm|MaximumDepth|ChildForm"));
  });

  it("scores ChildForm changes as HIGH or CRITICAL risk", () => {
    const analysis = analyzeChangedFile({
      path: "artifacts/kidschedule/src/pages/children/form.tsx",
      insertions: 90,
      deletions: 20,
    });
    assert.ok(analysis.riskScore >= 55);
    assert.ok(["HIGH", "CRITICAL"].includes(analysis.riskLevel));
    assert.equal(analysis.historicalP0Incidents, 4);
    assert.equal(analysis.riskMultiplier, 3);
  });

  it("links fingerprint to source files and tests", () => {
    const files = filesForFingerprint("ChildForm|MaximumDepth|InfantEffect");
    assert.ok(files.some((f) => f.includes("form.tsx")));
    assert.ok(files.some((f) => f.includes("child-form-hydration")));
  });

  it("flags HIGH_RISK when P0 fingerprint files change with tests not run", async () => {
    const report = await analyzeSimulatedRelease({
      files: [
        {
          path: "artifacts/kidschedule/src/pages/children/form.tsx",
          insertions: 45,
          deletions: 12,
        },
      ],
      version: "test-child-form",
      runTests: false,
    });
    assert.ok(["HIGH_RISK", "WARNING"].includes(report.verdict));
    assert.ok(report.impactedFingerprints.length >= 2);
    assert.ok(report.releaseRiskScore >= 50);
    assert.ok(report.highRiskAreas.length > 0);
  });

  it("BLOCKs when P0 fingerprint impacted and tests missing", () => {
    const risk = detectReleaseRisk({
      releaseRiskScore: 70,
      changedFiles: [],
      impactedFingerprints: [
        {
          readableFingerprint: "ChildForm|MaximumDepth|InfantEffect",
          severity: "P0",
          changedFiles: ["artifacts/kidschedule/src/pages/children/form.tsx"],
          components: ["ChildForm"],
          hooks: ["useEffect"],
          tests: [],
          regressionStatus: "missing",
          testsExist: false,
          testsExecuted: false,
          testsPassed: false,
        },
      ],
      regressionCoverage: {
        impactedFingerprints: 1,
        covered: 0,
        pending: 0,
        missing: 1,
        testsExecuted: 0,
        testsPassed: 0,
        gaps: ["ChildForm|MaximumDepth|InfantEffect: no regression tests registered"],
      },
      routeHeatmap: [],
      testsRun: false,
    });
    assert.equal(risk.verdict, "BLOCK");
    assert.ok(risk.recommendedBlockers.length > 0);
  });

  it("builds route heatmap with /children as highest P0 risk", () => {
    const heatmap = buildRouteRiskHeatmap({
      changedFiles: ["artifacts/kidschedule/src/pages/children/form.tsx"],
    });
    const children = heatmap.find((r) => r.route === "/children/:id");
    assert.ok(children);
    assert.equal(children.modifiedInRelease, true);
    assert.ok(children.p0Incidents >= 4);
  });

  it("computes aggregate release risk from top files", () => {
    const score = computeReleaseRiskScore([
      analyzeChangedFile({
        path: "artifacts/kidschedule/src/pages/children/form.tsx",
        insertions: 50,
        deletions: 10,
      }),
      analyzeChangedFile({
        path: "artifacts/kidschedule/src/lib/child-form-hydration.ts",
        insertions: 20,
        deletions: 5,
      }),
    ]);
    assert.ok(score >= 50);
  });

  it("applies historical 3x multiplier for form.tsx", () => {
    const hist = getHistoricalRiskForFile(
      "artifacts/kidschedule/src/pages/children/form.tsx",
    );
    assert.ok(hist);
    assert.equal(hist.p0Incidents, 4);
    assert.equal(hist.riskMultiplier, 3);
  });
});
