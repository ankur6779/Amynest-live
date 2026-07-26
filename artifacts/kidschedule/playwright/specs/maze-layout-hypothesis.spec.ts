/**
 * useLayoutEffect hypothesis validation — debug kill switches, 3-run triplet per flag.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { installTimerProbes } from "../helpers/game-perf-metrics";
import type { MazeDebugKillSwitch } from "../../src/lib/maze-debug-flags";

const OUT = path.join(process.cwd(), "certification/output/maze-layout-hypothesis");
const REPORT = path.join(OUT, "report.json");

type LayoutStats = {
  calls: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
  totalDomReads: number;
  totalDomWrites: number;
  maxNodesTouched: number;
};

type RunResult = {
  runIndex: number;
  pass: boolean;
  roundsCompleted: number;
  durationMs: number;
  abortedReason: string | null;
  layout: LayoutStats;
};

type ProfileResult = {
  profile: ProfileName;
  runs: RunResult[];
  verdict: "PASS_PASS_PASS" | "FAIL_FAIL_FAIL" | "INCONCLUSIVE";
  avgDurationMs: number;
  maxDurationMs: number;
  avgLayoutMaxMs: number;
  maxLayoutMaxMs: number;
  maxNodesTouched: number;
};

type ProfileName = "baseline" | MazeDebugKillSwitch;

const PROFILES: ProfileName[] = [
  "baseline",
  "mazeSkipLayoutEffect",
  "mazeSkipToneSweep",
  "mazeSkipCelebration",
  "mazeSkipAnimations",
  "mazeSkipAudio",
];

const MAX_RUN_MS = 120_000;
const CLICK_MS = 60;
const INTER_ROUND_MS = 25_000;

type HypothesisReport = {
  at: string;
  profiles: ProfileResult[];
  conclusion: {
    verified: boolean;
    isolatedSubsystem: string | null;
    confidence: number;
    evidence: string[];
  };
};

function loadReport(): HypothesisReport {
  if (fs.existsSync(REPORT)) {
    return JSON.parse(fs.readFileSync(REPORT, "utf8")) as HypothesisReport;
  }
  return {
    at: new Date().toISOString(),
    profiles: [],
    conclusion: { verified: false, isolatedSubsystem: null, confidence: 0, evidence: [] },
  };
}

function saveReport(r: HypothesisReport): void {
  fs.mkdirSync(OUT, { recursive: true });
  r.at = new Date().toISOString();
  fs.writeFileSync(REPORT, JSON.stringify(r, null, 2));
}

function triVerdict(runs: RunResult[]): ProfileResult["verdict"] {
  if (runs.length < 3) return "INCONCLUSIVE";
  const p = runs.map((r) => r.pass);
  if (p.every(Boolean)) return "PASS_PASS_PASS";
  if (p.every((x) => !x)) return "FAIL_FAIL_FAIL";
  return "INCONCLUSIVE";
}

function buildUrl(profile: ProfileName): string {
  const params = new URLSearchParams({ mode: "maze-easy", mazeDebug: "1" });
  if (profile !== "baseline") params.set(profile, "1");
  return `/playwright-gaming-hub-certification.html?${params.toString()}`;
}

const keyToLabel: Record<string, string> = {
  ArrowUp: "Move up",
  ArrowDown: "Move down",
  ArrowLeft: "Move left",
  ArrowRight: "Move right",
};

async function bfsPath(page: import("@playwright/test").Page): Promise<string[]> {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="maze-grid"]');
    if (!grid) return [] as string[];
    let size = 0;
    for (const el of grid.querySelectorAll("[data-cell]")) {
      const key = el.getAttribute("data-cell") || "";
      const [r, c] = key.split(",").map(Number);
      size = Math.max(size, r + 1, c + 1);
    }
    const last = size - 1;
    const hasWall = (r: number, c: number, dir: "up" | "down" | "left" | "right"): boolean => {
      const borderIsSolid = (cell: HTMLElement, side: "right" | "bottom"): boolean => {
        const cs = getComputedStyle(cell);
        const width = parseFloat(side === "right" ? cs.borderRightWidth : cs.borderBottomWidth);
        if (width < 2) return false;
        const color = side === "right" ? cs.borderRightColor : cs.borderBottomColor;
        return color !== "rgba(0, 0, 0, 0)" && !color.endsWith(", 0)");
      };
      if (dir === "right") {
        if (c >= last) return true;
        const cell = grid.querySelector(`[data-cell="${r},${c}"]`) as HTMLElement | null;
        return !cell || borderIsSolid(cell, "right");
      }
      if (dir === "left") {
        if (c <= 0) return true;
        const cell = grid.querySelector(`[data-cell="${r},${c - 1}"]`) as HTMLElement | null;
        return !cell || borderIsSolid(cell, "right");
      }
      if (dir === "down") {
        if (r >= last) return true;
        const cell = grid.querySelector(`[data-cell="${r},${c}"]`) as HTMLElement | null;
        return !cell || borderIsSolid(cell, "bottom");
      }
      if (r <= 0) return true;
      const cell = grid.querySelector(`[data-cell="${r - 1},${c}"]`) as HTMLElement | null;
      return !cell || borderIsSolid(cell, "bottom");
    };
    type Node = { r: number; c: number; path: string[] };
    const queue: Node[] = [{ r: 0, c: 0, path: [] }];
    const seen = new Set(["0,0"]);
    const dirs: Array<{ d: "up" | "down" | "left" | "right"; key: string }> = [
      { d: "up", key: "ArrowUp" },
      { d: "down", key: "ArrowDown" },
      { d: "left", key: "ArrowLeft" },
      { d: "right", key: "ArrowRight" },
    ];
    while (queue.length) {
      const node = queue.shift()!;
      if (node.r === last && node.c === last) return node.path;
      for (const { d, key } of dirs) {
        const nr = d === "up" ? node.r - 1 : d === "down" ? node.r + 1 : node.r;
        const nc = d === "left" ? node.c - 1 : d === "right" ? node.c + 1 : node.c;
        if (nr < 0 || nc < 0 || nr > last || nc > last) continue;
        if (hasWall(node.r, node.c, d)) continue;
        const k = `${nr},${nc}`;
        if (seen.has(k)) continue;
        seen.add(k);
        queue.push({ r: nr, c: nc, path: [...node.path, key] });
      }
    }
    return [] as string[];
  });
}

async function readLayoutStats(page: import("@playwright/test").Page): Promise<LayoutStats> {
  return page.evaluate(() => {
    const p = window.__mazeLayoutProfile ?? [];
    if (p.length === 0) {
      return {
        calls: 0,
        totalMs: 0,
        avgMs: 0,
        maxMs: 0,
        totalDomReads: 0,
        totalDomWrites: 0,
        maxNodesTouched: 0,
      };
    }
    const totalMs = p.reduce((s, e) => s + e.durationMs, 0);
    return {
      calls: p.length,
      totalMs: Math.round(totalMs * 100) / 100,
      avgMs: Math.round((totalMs / p.length) * 100) / 100,
      maxMs: Math.max(...p.map((e) => e.durationMs)),
      totalDomReads: p.reduce((s, e) => s + e.domReads, 0),
      totalDomWrites: p.reduce((s, e) => s + e.domWrites, 0),
      maxNodesTouched: Math.max(...p.map((e) => e.nodeCount)),
    };
  }).catch(() => ({
    calls: 0,
    totalMs: 0,
    avgMs: 0,
    maxMs: 0,
    totalDomReads: 0,
    totalDomWrites: 0,
    maxNodesTouched: 0,
  }));
}

async function runEightRoundSoak(
  page: import("@playwright/test").Page,
  profile: ProfileName,
  runIndex: number,
): Promise<RunResult> {
  return Promise.race([
    runEightRoundSoakInner(page, profile, runIndex),
    new Promise<RunResult>((resolve) => {
      setTimeout(async () => {
        const layout = await readLayoutStats(page).catch(() => ({
          calls: 0,
          totalMs: 0,
          avgMs: 0,
          maxMs: 0,
          totalDomReads: 0,
          totalDomWrites: 0,
          maxNodesTouched: 0,
        }));
        resolve({
          runIndex,
          pass: false,
          roundsCompleted: 0,
          durationMs: MAX_RUN_MS,
          abortedReason: "hardTimeout",
          layout,
        });
      }, MAX_RUN_MS + 3_000);
    }),
  ]);
}

async function runEightRoundSoakInner(
  page: import("@playwright/test").Page,
  profile: ProfileName,
  runIndex: number,
): Promise<RunResult> {
  const start = Date.now();
  let roundsCompleted = 0;
  let abortedReason: string | null = null;

  await page.goto(buildUrl(profile), { timeout: 20_000 });
  await page.evaluate((prof) => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
    [
      "mazeSkipLayoutEffect",
      "mazeSkipCelebration",
      "mazeSkipAnimations",
      "mazeSkipAudio",
      "mazeSkipToneSweep",
    ].forEach((k) => localStorage.removeItem(k));
    if (prof !== "baseline") localStorage.setItem(prof, "1");
    window.__mazeLayoutProfile = [];
  }, profile);
  await page.reload({ timeout: 20_000 });
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 20_000 });

  for (let round = 0; round < 8; round++) {
    if (Date.now() - start > MAX_RUN_MS) {
      abortedReason = "maxRunMs";
      break;
    }
    try {
      const moves = await bfsPath(page);
      if (moves.length === 0) {
        abortedReason = "noSolverPath";
        break;
      }
      for (const key of moves) {
        if (Date.now() - start > MAX_RUN_MS) {
          abortedReason = "maxRunMsDuringSolve";
          break;
        }
        await page.getByRole("button", { name: keyToLabel[key]! }).click({ timeout: 3000 });
        await page.waitForTimeout(CLICK_MS);
      }
      if (abortedReason) break;

      await page
        .getByRole("status")
        .filter({ hasText: /You escaped|Out of moves/ })
        .waitFor({ timeout: 20_000 });

      roundsCompleted = round + 1;

      if (round < 7) {
        const t0 = Date.now();
        let ok = false;
        while (Date.now() - t0 < INTER_ROUND_MS) {
          if (Date.now() - start > MAX_RUN_MS) {
            abortedReason = "maxRunMsInterRound";
            break;
          }
          try {
            ok = await page.evaluate(() => {
              const match = document.body.innerText.match(/Moves (\d+)\//);
              return match != null && match[1] === "0";
            }, { timeout: 2000 });
            if (ok) break;
          } catch {
            /* page may be busy */
          }
          await page.waitForTimeout(300);
        }
        if (abortedReason) break;
        if (!ok) {
          abortedReason = "interRoundResetTimeout";
          break;
        }
      } else {
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      abortedReason = e instanceof Error ? e.message : String(e);
      break;
    }
  }

  const layout = await readLayoutStats(page);
  const pass = roundsCompleted === 8 && !abortedReason;

  return {
    runIndex,
    pass,
    roundsCompleted,
    durationMs: Date.now() - start,
    abortedReason,
    layout,
  };
}

function evaluateReport(report: HypothesisReport): void {
  const baseline = report.profiles.find((p) => p.profile === "baseline");
  const baseVerdict = baseline?.verdict ?? "INCONCLUSIVE";

  const verified = report.profiles.find(
    (p) =>
      p.profile !== "baseline" &&
      baseVerdict === "FAIL_FAIL_FAIL" &&
      p.verdict === "PASS_PASS_PASS",
  );

  if (verified) {
    report.conclusion = {
      verified: true,
      isolatedSubsystem: verified.profile,
      confidence: 85,
      evidence: [
        `baseline: ${baseVerdict}`,
        `${verified.profile}: ${verified.verdict}`,
        ...verified.runs.map(
          (r) =>
            `run${r.runIndex}: pass=${r.pass} duration=${r.durationMs}ms layoutMax=${r.layout.maxMs}ms nodes=${r.layout.maxNodesTouched}`,
        ),
      ],
    };
    return;
  }

  const layoutSkip = report.profiles.find((p) => p.profile === "mazeSkipLayoutEffect");
  if (baseline && layoutSkip) {
    report.conclusion = {
      verified: false,
      isolatedSubsystem: null,
      confidence:
        baseVerdict === "FAIL_FAIL_FAIL" && layoutSkip.verdict === "PASS_PASS_PASS"
          ? 85
          : baseVerdict === layoutSkip.verdict
            ? 15
            : 35,
      evidence: [
        `baseline: ${baseVerdict} avgDuration=${baseline.avgDurationMs}ms layoutMax=${baseline.maxLayoutMaxMs}ms`,
        `mazeSkipLayoutEffect: ${layoutSkip.verdict} avgDuration=${layoutSkip.avgDurationMs}ms layoutMax=${layoutSkip.maxLayoutMaxMs}ms`,
        ...report.profiles.map(
          (p) => `${p.profile}: ${p.verdict} (${p.runs.map((r) => (r.pass ? "P" : "F")).join("")})`,
        ),
      ],
    };
  }
}

function summarizeProfile(profile: ProfileName, runs: RunResult[]): ProfileResult {
  return {
    profile,
    runs,
    verdict: triVerdict(runs),
    avgDurationMs: Math.round(runs.reduce((s, r) => s + r.durationMs, 0) / runs.length),
    maxDurationMs: Math.max(...runs.map((r) => r.durationMs)),
    avgLayoutMaxMs:
      Math.round((runs.reduce((s, r) => s + r.layout.maxMs, 0) / runs.length) * 100) / 100,
    maxLayoutMaxMs: Math.max(...runs.map((r) => r.layout.maxMs)),
    maxNodesTouched: Math.max(...runs.map((r) => r.layout.maxNodesTouched)),
  };
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installTimerProbes(page);
});

test("quick mazeSkipLayoutEffect only — 1 run", async ({ page }) => {
  test.setTimeout(130_000);
  const report = loadReport();
  const run = await runEightRoundSoak(page, "mazeSkipLayoutEffect", 0);
  report.profiles = report.profiles.filter((p) => p.profile !== "mazeSkipLayoutEffect");
  report.profiles.push(summarizeProfile("mazeSkipLayoutEffect", [run]));
  evaluateReport(report);
  saveReport(report);
});

test("quick compare — baseline vs mazeSkipLayoutEffect (1 run each)", async ({ page }) => {
  test.setTimeout(280_000);
  const report = loadReport();
  report.profiles = [];

  for (const profile of ["baseline", "mazeSkipLayoutEffect"] as ProfileName[]) {
    const run = await runEightRoundSoak(page, profile, 0);
    report.profiles.push(summarizeProfile(profile, [run]));
    evaluateReport(report);
    saveReport(report);
  }
});

for (const profile of PROFILES) {
  test(`${profile} — 3-run validation`, async ({ page }) => {
    test.setTimeout(400_000);
    const report = loadReport();
    const runs: RunResult[] = [];

    for (let i = 0; i < 3; i++) {
      runs.push(await runEightRoundSoak(page, profile, i));
      const summary = summarizeProfile(profile, runs);
      report.profiles = report.profiles.filter((p) => p.profile !== profile);
      report.profiles.push(summary);
      evaluateReport(report);
      saveReport(report);

      if (profile !== "baseline") {
        const base = report.profiles.find((p) => p.profile === "baseline");
        if (
          base?.verdict === "FAIL_FAIL_FAIL" &&
          summary.verdict === "PASS_PASS_PASS"
        ) {
          break;
        }
      }
    }

    evaluateReport(report);
    saveReport(report);
  });
}
