/**
 * Engineering audit report — top crash fingerprints with root cause + fix suggestions.
 *
 *   DATABASE_URL=... pnpm run crash:engineering-audit
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL required for engineering audit report.");
    process.exit(1);
  }

  const { generateEngineeringAuditReport } = await import(
    "../artifacts/api-server/src/services/crash-intelligence/audit-report.js"
  );
  const { syncCrashRegressionRegistry } = await import(
    "../artifacts/api-server/src/services/crash-intelligence/ingest-service.js"
  );

  await syncCrashRegressionRegistry();
  const report = await generateEngineeringAuditReport(20);

  const outPath = join(REPO_ROOT, "artifacts/crash-audit-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("\n=== AmyNest Crash Engineering Audit ===\n");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Global recovery rate: ${report.globalRecoveryRate}%`);
  console.log(`Launch gate: ${report.launchGate.pass ? "PASS" : "BLOCKED"}\n`);

  for (const entry of report.entries) {
    const { aggregate: a, rootCause, fixSuggestion, regression } = entry;
    console.log(`--- ${a.readableFingerprint} [${a.severity}] ---`);
    console.log(`  24h: ${a.count24h} | 7d: ${a.count7d} | users: ${a.affectedUsers}`);
    console.log(`  Routes: ${a.affectedRoutes.join(", ") || "—"}`);
    console.log(`  Recovery: ${a.recoverySuccessRate}%`);
    console.log(`  Examples: ${a.exampleErrorIds.join(", ") || "—"}`);
    if (rootCause) {
      console.log(`  Root cause: ${rootCause.chain.join(" → ")}`);
    }
    if (fixSuggestion) {
      console.log(`  Fix: ${fixSuggestion.minimalFix}`);
      console.log(`  Risk: ${fixSuggestion.regressionRisk}`);
    }
    if (regression) {
      console.log(`  Regression: ${regression.status} (${regression.testPaths.length} tests)`);
    }
    console.log();
  }

  if (report.launchGate.blockers.length > 0) {
    console.log("Launch blockers:");
    for (const b of report.launchGate.blockers) console.log(`  ✗ ${b}`);
  }

  console.log(`\nFull report: ${outPath}\n`);
}

void main();
