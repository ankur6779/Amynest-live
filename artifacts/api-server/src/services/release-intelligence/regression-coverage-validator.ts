import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getRegressionForFingerprint,
  verifyRegressionTestFiles,
} from "../crash-intelligence/regression-registry.js";
import type { FingerprintImpactEntry } from "./fingerprint-impact-map.js";
import type { ImpactedFingerprint, RegressionCoverageReport } from "./types.js";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");

export function validateRegressionCoverage(
  impacted: FingerprintImpactEntry[],
  options?: { runTests?: boolean },
): {
  fingerprints: ImpactedFingerprint[];
  report: RegressionCoverageReport;
} {
  const fingerprints: ImpactedFingerprint[] = [];
  const gaps: string[] = [];
  let covered = 0;
  let pending = 0;
  let missing = 0;
  let testsExecuted = 0;
  let testsPassed = 0;

  const testsToRun = new Set<string>();

  for (const entry of impacted) {
    const regression = getRegressionForFingerprint(entry.readableFingerprint);
    const verified = regression
      ? verifyRegressionTestFiles(regression)
      : { ok: false, missing: [] as string[] };

    let regressionStatus: ImpactedFingerprint["regressionStatus"] = "missing";
    if (!regression || regression.testPaths.length === 0) {
      missing++;
      regressionStatus = "missing";
      gaps.push(`${entry.readableFingerprint}: no regression tests registered`);
    } else if (regression.status === "covered" && verified.ok) {
      covered++;
      regressionStatus = "covered";
      for (const t of regression.testPaths) testsToRun.add(t);
    } else {
      pending++;
      regressionStatus = "pending";
      gaps.push(
        `${entry.readableFingerprint}: tests ${verified.ok ? "pending status" : `missing files: ${verified.missing.join(", ")}`}`,
      );
      if (regression) {
        for (const t of regression.testPaths) testsToRun.add(t);
      }
    }

    fingerprints.push({
      readableFingerprint: entry.readableFingerprint,
      severity: entry.severity,
      changedFiles: entry.files,
      components: [entry.component],
      hooks: entry.hooks,
      tests: regression?.testPaths ?? [],
      regressionStatus,
      testsExist: verified.ok,
      testsExecuted: false,
      testsPassed: false,
    });
  }

  if (options?.runTests && testsToRun.size > 0) {
    const result = runRegressionTests([...testsToRun]);
    testsExecuted = result.executed;
    testsPassed = result.passed ? result.executed : 0;

    for (const fp of fingerprints) {
      if (fp.tests.length > 0) {
        fp.testsExecuted = true;
        fp.testsPassed = result.passed;
      }
    }

    if (!result.passed) {
      gaps.push(`Regression test execution failed: ${result.detail}`);
    }
  }

  return {
    fingerprints,
    report: {
      impactedFingerprints: impacted.length,
      covered,
      pending,
      missing,
      testsExecuted,
      testsPassed,
      gaps,
    },
  };
}

function runRegressionTests(paths: string[]): {
  executed: number;
  passed: boolean;
  detail: string;
} {
  const kidschedulePaths = paths.filter((p) => p.includes("kidschedule/"));
  if (kidschedulePaths.length === 0) {
    return { executed: 0, passed: true, detail: "no kidschedule tests" };
  }

  const vitestArgs = kidschedulePaths.map((p) =>
    p.replace("artifacts/kidschedule/", "src/"),
  );

  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@workspace/kidschedule",
      "exec",
      "vitest",
      "run",
      ...vitestArgs,
    ],
    { cwd: REPO_ROOT, stdio: "pipe", encoding: "utf8" },
  );

  return {
    executed: vitestArgs.length,
    passed: result.status === 0,
    detail: result.status === 0 ? "ok" : (result.stderr || result.stdout).slice(0, 500),
  };
}
