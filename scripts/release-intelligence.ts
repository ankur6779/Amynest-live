/**
 * Pre-deploy Release Intelligence & Regression Prevention Engine.
 * Read-only — never modifies code or blocks deploys automatically.
 *
 *   pnpm release:intelligence
 *   pnpm release:intelligence -- --base main --run-tests
 *   pnpm release:intelligence -- --simulate child-form
 *
 * Outputs: PASS | WARNING | HIGH_RISK | BLOCK
 * Writes: artifacts/release-review/<version>.md + latest.json
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const CHILD_FORM_SIMULATE = [
  "artifacts/kidschedule/src/pages/children/form.tsx",
  "artifacts/kidschedule/src/lib/child-form-hydration.ts",
];

function parseArgs(argv: string[]): {
  base?: string;
  head?: string;
  version?: string;
  runTests: boolean;
  simulate?: string;
} {
  const out = { runTests: false } as ReturnType<typeof parseArgs>;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base" && argv[i + 1]) out.base = argv[++i];
    else if (a === "--head" && argv[i + 1]) out.head = argv[++i];
    else if (a === "--version" && argv[i + 1]) out.version = argv[++i];
    else if (a === "--run-tests") out.runTests = true;
    else if (a === "--simulate" && argv[i + 1]) out.simulate = argv[++i];
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.simulate === "child-form") {
    process.env.RELEASE_INTEL_SIMULATE = JSON.stringify(
      CHILD_FORM_SIMULATE.map((path) => ({
        path,
        insertions: 45,
        deletions: 12,
      })),
    );
  }

  const { analyzeRelease } = await import(
    "../artifacts/api-server/src/services/release-intelligence/analyze-release.js"
  );

  let report;
  if (process.env.RELEASE_INTEL_SIMULATE) {
    const { analyzeSimulatedRelease } = await import(
      "../artifacts/api-server/src/services/release-intelligence/analyze-release.js"
    );
    report = await analyzeSimulatedRelease({
      files: JSON.parse(process.env.RELEASE_INTEL_SIMULATE),
      version: args.version ?? "simulate-child-form",
      runTests: args.runTests,
    });
  } else {
    report = await analyzeRelease({
      base: args.base ?? process.env.RELEASE_BASE_REF ?? "main",
      head: args.head,
      version: args.version,
      runTests: args.runTests,
    });
  }

  console.log("\n[release:intelligence] Release Intelligence Report\n");
  console.log(`  Version:     ${report.version}`);
  console.log(`  Verdict:     ${report.verdict}`);
  console.log(`  Risk score:  ${report.releaseRiskScore}/100`);
  console.log(`  Changed:     ${report.changedFiles.length} files`);
  console.log(`  Impacted FP: ${report.impactedFingerprints.length}`);
  console.log(
    `  Regression:  covered=${report.regressionCoverage.covered} pending=${report.regressionCoverage.pending} missing=${report.regressionCoverage.missing}`,
  );

  if (report.impactedFingerprints.length > 0) {
    console.log("\n  Impacted fingerprints:");
    for (const fp of report.impactedFingerprints) {
      console.log(
        `    • ${fp.readableFingerprint} [${fp.severity}] — tests: ${fp.regressionStatus}`,
      );
    }
  }

  if (report.highRiskAreas.length > 0) {
    console.log("\n  High-risk areas:");
    for (const a of report.highRiskAreas.slice(0, 8)) {
      console.log(`    • ${a}`);
    }
  }

  if (report.recommendedBlockers.length > 0) {
    console.log("\n  Blockers:");
    for (const b of report.recommendedBlockers) console.log(`    ✗ ${b}`);
  }

  if (report.warnings.length > 0) {
    console.log("\n  Warnings:");
    for (const w of report.warnings.slice(0, 6)) console.log(`    ⚠ ${w}`);
  }

  console.log(`\n  Review: artifacts/release-review/${report.version}.md`);
  console.log(`  JSON:   artifacts/release-review/latest.json\n`);

  if (report.verdict === "BLOCK") {
    console.log("[release:intelligence] BLOCK — address blockers before deploy.\n");
    process.exit(1);
  }
  if (report.verdict === "HIGH_RISK") {
    console.log("[release:intelligence] HIGH_RISK — manual review required.\n");
    process.exit(2);
  }
  if (report.verdict === "WARNING") {
    console.log("[release:intelligence] WARNING — proceed with caution.\n");
    process.exit(0);
  }
  console.log("[release:intelligence] PASS — release risk acceptable.\n");
}

void main();
