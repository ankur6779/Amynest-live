#!/usr/bin/env node
/**
 * Production QA gate — unit tests + stress matrix summary + diagnostics smoke.
 * Run: node --import tsx/esm scripts/routine-production-qa.mjs [--json-out=path]
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const jsonOut = process.argv.find((a) => a.startsWith("--json-out="))?.split("=")[1];

const UNIT_FILES = [
  "src/lib/routine-activity-metadata.test.ts",
  "src/lib/routine-schedule-conflicts.test.ts",
  "src/lib/routine-daily-load.test.ts",
  "src/lib/routine-emotional-pacing.test.ts",
  "src/lib/routine-adaptive-completion.test.ts",
  "src/lib/routine-family-intelligence-moat.test.ts",
  "src/lib/routine-intelligence-pipeline.test.ts",
  "src/lib/routine-final-integrity.test.ts",
  "src/lib/routine-trust-validators.test.ts",
  "src/lib/routine-evidence-strength.test.ts",
];

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: false });
  return {
    ok: r.status === 0,
    status: r.status ?? 1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

const unit = run("node", ["--import", "tsx/esm", "--test", ...UNIT_FILES], ROOT);

let stress = { ok: false, summary: null, stderr: "" };
const stressRun = run(
  "node",
  ["--import", "tsx/esm", "scripts/routine-stress-qa.mjs", "--json-out=/tmp/routine-stress-qa-prod.json"],
  ROOT,
);
stress.ok = stressRun.ok;
if (stressRun.ok) {
  try {
    const raw = JSON.parse(readFileSync("/tmp/routine-stress-qa-prod.json", "utf8"));
    stress.summary = raw?.report?.summary ?? null;
    stress.releaseGate = raw?.report?.releaseGate ?? null;
    const results = raw?.results ?? [];
    stress.infantSafetyFailures = results.filter((r) =>
      (r.warnings ?? []).some((w) => String(w).startsWith("infant safety:")),
    ).length;
    stress.passRate =
      stress.summary?.scenarioTests > 0
        ? Number(stress.summary.passed) / Number(stress.summary.scenarioTests)
        : 0;
  } catch {
    stress.summary = null;
  }
} else {
  stress.stderr = stressRun.stderr.slice(0, 2000);
}

const report = {
  generatedAt: new Date().toISOString(),
  unitTests: {
    pass: unit.ok,
    files: UNIT_FILES.length,
  },
  stressQa: {
    pass: stress.ok,
    summary: stress.summary,
    infantSafetyFailures: stress.infantSafetyFailures ?? null,
    passRate: stress.passRate ?? null,
  },
  productionGate: {
    pass: unit.ok && stress.ok && (stress.releaseGate?.gatePass ?? false),
    tier: unit.ok && stress.ok && (stress.releaseGate?.gatePass ?? false) ? "ready" : "blocked",
  },
};

const text = JSON.stringify(report, null, 2);
console.log(text);
if (jsonOut) {
  writeFileSync(resolve(jsonOut), text);
}

process.exit(report.productionGate.pass ? 0 : 1);
