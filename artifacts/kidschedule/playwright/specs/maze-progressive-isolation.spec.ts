/**
 * Progressive binary isolation — 90s max per experiment, 3 runs each, per-round telemetry.
 */
import fs from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";
import { installTimerProbes } from "../helpers/game-perf-metrics";
import {
  MAX_EXPERIMENT_MS,
  PROGRESSIVE_PROFILES,
  preparePage,
  runProgressiveExperiment,
  triRunVerdict,
  type ExperimentResult,
  type TriRunVerdict,
} from "../helpers/maze-progressive-isolation";
import type { MazeIsolateProfile } from "../helpers/maze-isolation";

const OUT = path.join(process.cwd(), "certification/output/maze-progressive-isolation");
const REPORT = path.join(OUT, "report.json");

type ProgressiveReport = {
  at: string;
  maxExperimentMs: number;
  matrix: Array<{
    profile: MazeIsolateProfile;
    disabled: boolean;
    runs: ExperimentResult[];
    verdict: TriRunVerdict;
    baselineVerdict?: TriRunVerdict;
    outcomeChanged: boolean | null;
  }>;
  freezes: Array<{
    profile: MazeIsolateProfile;
    runIndex: number;
    freezeRound: number | null;
    lastCheckpoint: string | null;
    abortedReason: string | null;
  }>;
  conclusion: {
    mostLikelySubsystem: string | null;
    confidence: number;
    evidence: string[];
    stoppedEarly: boolean;
    reason: string;
  };
};

function loadReport(): ProgressiveReport {
  if (fs.existsSync(REPORT)) {
    return JSON.parse(fs.readFileSync(REPORT, "utf8")) as ProgressiveReport;
  }
  return {
    at: new Date().toISOString(),
    maxExperimentMs: MAX_EXPERIMENT_MS,
    matrix: [],
    freezes: [],
    conclusion: {
      mostLikelySubsystem: null,
      confidence: 0,
      evidence: [],
      stoppedEarly: false,
      reason: "",
    },
  };
}

function saveReport(r: ProgressiveReport): void {
  fs.mkdirSync(OUT, { recursive: true });
  r.at = new Date().toISOString();
  fs.writeFileSync(REPORT, JSON.stringify(r, null, 2));
}

function upsertMatrix(
  report: ProgressiveReport,
  profile: MazeIsolateProfile,
  disabled: boolean,
  runs: ExperimentResult[],
  baselineVerdict?: TriRunVerdict,
): void {
  const verdict = triRunVerdict(runs);
  let outcomeChanged: boolean | null = null;
  if (baselineVerdict && profile !== "baseline") {
    if (baselineVerdict === "FAIL_FAIL_FAIL" && verdict === "PASS_PASS_PASS") outcomeChanged = true;
    else if (baselineVerdict === "PASS_PASS_PASS" && verdict === "FAIL_FAIL_FAIL") outcomeChanged = true;
    else outcomeChanged = false;
  }
  report.matrix = report.matrix.filter(
    (m) => !(m.profile === profile && m.disabled === disabled),
  );
  report.matrix.push({ profile, disabled, runs, verdict, baselineVerdict, outcomeChanged });
  for (const run of runs) {
    if (!run.pass) {
      report.freezes.push({
        profile,
        runIndex: run.runIndex,
        freezeRound: run.freezeRound,
        lastCheckpoint: run.lastCheckpoint,
        abortedReason: run.abortedReason,
      });
    }
  }
}

function evaluateConclusion(report: ProgressiveReport): void {
  const baseline = report.matrix.find((m) => m.profile === "baseline" && !m.disabled);
  const baselineVerdict = baseline?.verdict ?? "INCONCLUSIVE";

  const changed = report.matrix.filter((m) => m.outcomeChanged === true);
  if (changed.length === 1) {
    report.conclusion = {
      mostLikelySubsystem: changed[0]!.profile,
      confidence: 85,
      evidence: changed[0]!.runs.map(
        (r) =>
          `run${r.runIndex}: pass=${r.pass} rounds=${r.roundsCompleted} last=${r.lastCheckpoint} heapΔ=${r.heapDelta}`,
      ),
      stoppedEarly: true,
      reason: `Disabling ${changed[0]!.profile} flipped ${baselineVerdict} → ${changed[0]!.verdict}`,
    };
    return;
  }
  if (changed.length > 1) {
    report.conclusion = {
      mostLikelySubsystem: changed.map((c) => c.profile).join("+"),
      confidence: 60,
      evidence: changed.flatMap((c) =>
        c.runs.map((r) => `${c.profile} run${r.runIndex}: pass=${r.pass}`),
      ),
      stoppedEarly: true,
      reason: "Multiple subsystems changed outcome",
    };
    return;
  }

  const failFreezes = report.freezes.filter((f) => f.lastCheckpoint);
  const checkpointCounts = new Map<string, number>();
  for (const f of failFreezes) {
    const k = f.lastCheckpoint ?? "unknown";
    checkpointCounts.set(k, (checkpointCounts.get(k) ?? 0) + 1);
  }
  const top = [...checkpointCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  report.conclusion = {
    mostLikelySubsystem: top ? `checkpoint:${top[0]}` : null,
    confidence: top ? Math.min(70, top[1] * 20) : 0,
    evidence: [
      `Baseline verdict: ${baselineVerdict}`,
      ...report.freezes.slice(0, 8).map(
        (f) =>
          `${f.profile} run${f.runIndex} round=${f.freezeRound} last=${f.lastCheckpoint} reason=${f.abortedReason}`,
      ),
    ],
    stoppedEarly: false,
    reason: top ? `Most frequent last checkpoint before freeze: ${top[0]} (${top[1]}x)` : "No conclusive isolation",
  };
}

test.describe.configure({ mode: "serial", timeout: 120_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installTimerProbes(page);
});

test("quick decorative disabled — one 60s run", async ({ page }) => {
  test.setTimeout(75_000);
  await preparePage(page, "decorative", true);
  const result = await runProgressiveExperiment(page, "decorative", true, 0, MAX_EXPERIMENT_MS);
  const report = loadReport();
  upsertMatrix(report, "decorative", true, [result]);
  evaluateConclusion(report);
  saveReport(report);
});

test("quick baseline — one 60s run with round snapshots", async ({ page }) => {
  test.setTimeout(75_000);
  await preparePage(page, "baseline", false);
  const result = await runProgressiveExperiment(page, "baseline", false, 0, MAX_EXPERIMENT_MS);
  const report = loadReport();
  upsertMatrix(report, "baseline", false, [result]);
  evaluateConclusion(report);
  saveReport(report);
});

test("baseline tri-run", async ({ page }) => {
  test.setTimeout(320_000);
  const report = loadReport();
  const baselineRuns: ExperimentResult[] = [];
  for (let i = 0; i < 3; i++) {
    await preparePage(page, "baseline", false);
    const run = await runProgressiveExperiment(page, "baseline", false, i, MAX_EXPERIMENT_MS);
    baselineRuns.push(run);
    upsertMatrix(report, "baseline", false, [...baselineRuns]);
    saveReport(report);
  }
  evaluateConclusion(report);
  saveReport(report);
});

for (const profile of PROGRESSIVE_PROFILES.filter((p) => p !== "baseline")) {
  test(`isolate ${profile} disabled — tri-run`, async ({ page }) => {
    test.setTimeout(320_000);
    const report = loadReport();
    const baseline = report.matrix.find((m) => m.profile === "baseline" && !m.disabled);
    const baselineVerdict = baseline?.verdict ?? "INCONCLUSIVE";
    const runs: ExperimentResult[] = [];
    for (let i = 0; i < 3; i++) {
      await preparePage(page, profile, true);
      runs.push(await runProgressiveExperiment(page, profile, true, i, MAX_EXPERIMENT_MS));
      upsertMatrix(report, profile, true, [...runs], baselineVerdict);
      saveReport(report);
    }
    evaluateConclusion(report);
    saveReport(report);
  });
}
