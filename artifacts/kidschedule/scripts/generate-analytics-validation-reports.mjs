#!/usr/bin/env node
/**
 * Generate Phase 1 analytics validation reports (Section 13).
 * Run from repo root: node artifacts/kidschedule/scripts/generate-analytics-validation-reports.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const kidscheduleRoot = join(__dirname, "..");
const repoRoot = join(kidscheduleRoot, "../..");
const outDir = join(repoRoot, "docs/production-stabilization/phase-1/reports");

process.chdir(kidscheduleRoot);

const mod = await import(
  pathToFileURL(join(kidscheduleRoot, "src/lib/analytics/validation-report.ts")).href
);
const report = mod.buildAnalyticsValidationReport(join(kidscheduleRoot, "src"));
const formatted = mod.formatValidationReports(report);

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "coverage-report.md"), formatted.coverage);
writeFileSync(join(outDir, "missing-events-report.md"), formatted.missingEvents);
writeFileSync(join(outDir, "duplicate-events-report.md"), formatted.duplicates);
writeFileSync(join(outDir, "event-taxonomy-report.md"), formatted.taxonomy);
writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));

console.info("[analytics-validation] wrote reports to", outDir);
console.info(JSON.stringify({
  duplicateGrowthEmitter: report.duplicateGrowthEmitter,
  phase1Missing: report.phase1Missing,
  unwiredPhase1Events: report.unwiredPhase1Events,
  screenTrackingCoveragePct: report.screenTrackingCoveragePct,
}, null, 2));
