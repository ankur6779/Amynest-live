#!/usr/bin/env tsx
/**
 * Phonics curriculum audit — CI gate for duplicates, orphans, and level leaks.
 *
 *   pnpm run audit:phonics
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  diffAgainstBaseline,
  runPhonicsCurriculumAudit,
  type PhonicsAuditFinding,
} from "../lib/phonics-curriculum/src/index.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_PATH = join(
  REPO_ROOT,
  "lib/phonics-curriculum/audit-baseline.json",
);

interface AuditBaseline {
  version: 1;
  /** Stable keys: `${kind}:${id}` for known non-blocking findings. */
  knownFindingKeys: string[];
}

function loadBaseline(): AuditBaseline {
  if (!existsSync(BASELINE_PATH)) {
    return { version: 1, knownFindingKeys: [] };
  }
  return JSON.parse(readFileSync(BASELINE_PATH, "utf8")) as AuditBaseline;
}

function findingKey(f: PhonicsAuditFinding): string {
  return `${f.kind}:${f.id}`;
}

function printReport(
  report: ReturnType<typeof runPhonicsCurriculumAudit>,
  newFindings: PhonicsAuditFinding[],
): void {
  console.log("\n── Phonics Curriculum Audit ──\n");
  console.log("Summary:");
  console.log(`  Duplicate concepts:  ${report.summary.duplicateConcepts}`);
  console.log(`  Duplicate words:     ${report.summary.duplicateWords}`);
  console.log(`  Orphan words:        ${report.summary.orphanWords}`);
  console.log(`  Unreachable content: ${report.summary.unreachableContent}`);
  console.log(`  Level leaks:         ${report.summary.levelLeaks}`);
  console.log(`  Ownership errors:    ${report.summary.ownershipErrors}`);
  console.log(`  Story prereq issues: ${report.summary.storyPrerequisiteViolations}`);
  console.log(`  Total findings:      ${report.findings.length}`);

  if (report.findings.length > 0) {
    console.log("\nFindings (first 25):");
    for (const f of report.findings.slice(0, 25)) {
      console.log(`  [${f.kind}] ${f.id}: ${f.detail}`);
    }
    if (report.findings.length > 25) {
      console.log(`  … and ${report.findings.length - 25} more`);
    }
  }

  if (newFindings.length > 0) {
    console.log("\n✗ NEW blocking findings (not in baseline):");
    for (const f of newFindings) {
      console.log(`  [${f.kind}] ${f.id}: ${f.detail}`);
    }
  } else {
    console.log("\n✓ No new blocking findings vs baseline");
  }
}

function main(): void {
  const writeBaseline = process.argv.includes("--write-baseline");
  const report = runPhonicsCurriculumAudit();
  const baseline = loadBaseline();
  const diff = diffAgainstBaseline(report, baseline.knownFindingKeys);

  printReport(report, diff.newFindings);

  if (writeBaseline) {
    const keys = report.findings.map(findingKey);
    const next: AuditBaseline = { version: 1, knownFindingKeys: keys };
    writeFileSync(BASELINE_PATH, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`\nWrote baseline (${keys.length} keys) → ${BASELINE_PATH}`);
    process.exit(0);
  }

  if (!report.ok) {
    console.error("\n[audit:phonics] FAIL — blocking curriculum integrity issues.\n");
    process.exit(1);
  }

  if (!diff.ok) {
    console.error("\n[audit:phonics] FAIL — new duplicates, orphans, or level leaks.\n");
    process.exit(1);
  }

  console.log("\n[audit:phonics] PASS\n");
}

main();
