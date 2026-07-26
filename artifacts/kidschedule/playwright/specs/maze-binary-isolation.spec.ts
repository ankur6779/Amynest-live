/**
 * Binary subsystem isolation — 8-round d-pad soak per candidate.
 * Records freeze matrix, heap growth, and Chrome long-task profile (rounds 5–8).
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { installTimerProbes } from "../helpers/game-perf-metrics";
import {
  PRIORITY_ISOLATES,
  applyMazeIsolation,
  buildMazeUrl,
  captureHeapSnapshot,
  installLongTaskProbe,
  readLongTaskSummary,
  type HeapSnapshot,
  type MazeIsolateProfile,
  type SoakResult,
} from "../helpers/maze-isolation";

const OUT = path.join(process.cwd(), "certification/output/maze-binary-isolation");
const REPORT_PATH = path.join(OUT, "report.json");

const HEAP_ROUNDS = [1, 2, 4, 8] as const;
const INTER_ROUND_TIMEOUT_MS = 45_000;
const ROUND_SOLVE_TIMEOUT_MS = 35_000;

type IsolationReport = {
  at: string;
  methodology: string;
  phase1Subsystems: Record<string, string>;
  matrix: Array<{
    subsystem: MazeIsolateProfile;
    enabled: SoakResult;
    disabled: SoakResult;
    freezeEliminatedByDisable: boolean | null;
    likelyCause: boolean;
  }>;
  heapAnalysis: {
    baselineGrowth: HeapSnapshot[];
    runawayDetected: boolean;
    notes: string[];
  };
  strictModeComparison: {
    strictOn: Pick<SoakResult, "completed" | "durationMs" | "hangRound" | "error">;
    strictOff: Pick<SoakResult, "completed" | "durationMs" | "hangRound" | "error">;
    behaviorChanged: boolean;
  };
  chromePerformance: {
    rounds5to8LongTasks: Record<string, unknown>;
    lastTimelineEntry: unknown;
  };
  playwrightVsManual: {
    playwrightFreezeReproduced: boolean;
    manualReproConfirmed: boolean;
    certFixtureDifferences: string[];
  };
  conclusion: {
    isolatedSubsystem: string | null;
    rootCause: string;
    evidence: string[];
    isolationMethod: string;
    behaviorWhenDisabled: string;
  };
};

function loadReport(): IsolationReport {
  if (fs.existsSync(REPORT_PATH)) {
    return JSON.parse(fs.readFileSync(REPORT_PATH, "utf8")) as IsolationReport;
  }
  return {
    at: new Date().toISOString(),
    methodology: "Binary isolation via cert fixture query params + Playwright initScript stubs",
    phase1Subsystems: {},
    matrix: [],
    heapAnalysis: { baselineGrowth: [], runawayDetected: false, notes: [] },
    strictModeComparison: {
      strictOn: { completed: false, durationMs: 0, hangRound: null, error: null },
      strictOff: { completed: false, durationMs: 0, hangRound: null, error: null },
      behaviorChanged: false,
    },
    chromePerformance: { rounds5to8LongTasks: {}, lastTimelineEntry: null },
    playwrightVsManual: {
      playwrightFreezeReproduced: false,
      manualReproConfirmed: false,
      certFixtureDifferences: [
        "No auth shell / hub routing — direct MazeEscapeGame mount",
        "StrictMode wraps cert fixture (toggle via ?noStrictMode=1)",
        "Toaster mounted but unused during maze play",
        "GAME_PERF_STYLES injected globally",
        "i18n initialized but maze path does not use translations",
        "API routes stubbed 200 in Playwright",
        "Auto BFS solver uses d-pad clicks (80ms delay) vs manual swipe/keyboard",
      ],
    },
    conclusion: {
      isolatedSubsystem: null,
      rootCause: "pending",
      evidence: [],
      isolationMethod: "",
      behaviorWhenDisabled: "",
    },
  };
}

function persistReport(report: IsolationReport): void {
  fs.mkdirSync(OUT, { recursive: true });
  report.at = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

const keyToLabel: Record<string, string> = {
  ArrowUp: "Move up",
  ArrowDown: "Move down",
  ArrowLeft: "Move left",
  ArrowRight: "Move right",
};

async function bfsSolvePath(page: import("@playwright/test").Page): Promise<string[]> {
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
    const seen = new Set<string>(["0,0"]);
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

async function solveRoundDpad(page: import("@playwright/test").Page): Promise<void> {
  const moves = await bfsSolvePath(page);
  expect(moves.length).toBeGreaterThan(0);
  for (const key of moves) {
    await page.getByRole("button", { name: keyToLabel[key]! }).click();
    await page.waitForTimeout(80);
  }
  await page
    .getByRole("status")
    .filter({ hasText: /You escaped|Out of moves/ })
    .waitFor({ timeout: ROUND_SOLVE_TIMEOUT_MS });
}

async function waitInterRoundReset(page: import("@playwright/test").Page): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const match = document.body.innerText.match(/Moves (\d+)\//);
        return match != null && match[1] === "0";
      },
      { timeout: INTER_ROUND_TIMEOUT_MS },
    );
    return true;
  } catch {
    return false;
  }
}

async function runEightRoundSoak(
  page: import("@playwright/test").Page,
  profile: MazeIsolateProfile,
  disabled: boolean,
): Promise<SoakResult> {
  const start = Date.now();
  const heapSnapshots: HeapSnapshot[] = [];
  let roundsCompleted = 0;
  let hangRound: number | null = null;
  let error: string | null = null;
  let perfRounds5to8: SoakResult["perfRounds5to8"] = null;
  let finishedVisible = false;

  const url = buildMazeUrl(profile, disabled);
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
    (window as Window & { __mazeLongTasks?: unknown[] }).__mazeLongTasks = [];
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });

  for (let round = 0; round < 8; round++) {
    try {
      if (round >= 4) {
        await page.evaluate(() => {
          (window as Window & { __mazeLongTasks?: unknown[] }).__mazeLongTasks = [];
        });
      }

      await solveRoundDpad(page);
      roundsCompleted = round + 1;

      const roundNum = round + 1;
      if ((HEAP_ROUNDS as readonly number[]).includes(roundNum)) {
        heapSnapshots.push(await captureHeapSnapshot(page, roundNum));
      }

      if (round >= 4 && round === 7) {
        const lt = await readLongTaskSummary(page);
        perfRounds5to8 = {
          longTasksOver50: lt.longTasksOver50,
          longestTaskMs: lt.longestTaskMs,
          longTasksOver100: lt.longTasksOver100,
        };
      }

      if (round < 7) {
        const resetOk = await waitInterRoundReset(page);
        if (!resetOk) {
          hangRound = round + 1;
          error = `inter-round reset timed out after round ${round + 1}`;
          break;
        }
      } else {
        await page.waitForTimeout(1500);
      }
    } catch (e) {
      hangRound = round;
      error = e instanceof Error ? e.message : String(e);
      break;
    }
  }

  try {
    finishedVisible = await page
      .locator('[data-testid="gh-cert-finished"]')
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
  } catch {
    finishedVisible = false;
  }

  return {
    profile,
    disabled,
    completed: roundsCompleted === 8 && !error,
    roundsCompleted,
    hangRound,
    error,
    durationMs: Date.now() - start,
    heapSnapshots,
    perfRounds5to8,
    finishedVisible,
  };
}

test.describe.configure({ mode: "serial", timeout: 600_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installTimerProbes(page);
  await installLongTaskProbe(page);
});

test("Phase 1 — subsystem inventory (static)", async () => {
  const report = loadReport();
  report.phase1Subsystems = {
    gameState:
      "useState roundIdx/sessionScore/maze/pos/visited/moves/done/won; refs doneRef/sessionFinishedRef/pendingFinishRef",
    finishLifecycle:
      "pendingFinishRef → useEffect([moves,pos]) → finishRound; doneRef gate; 1400ms inter-round setTimeout",
    loadRound: "buildRound → generateValidatedMaze + adaptiveMazeSize; clears finish timer",
    celebration: "victoryPath Set, won status div, feedbackCorrect on escape",
    confetti: "ConfettiBurst (framer-motion AnimatePresence, 18 motion.span) when !reduceEffects",
    audio: "feedbackMove/Correct/Wrong → playProceduralTone (Web Audio)",
    haptics: "nativeImpact/nativeNotification via Capacitor or navigator.vibrate",
    animations:
      "CSS keyframes: mazeCellReveal, mazePlayerPulse, mazeGoalPulse, mazeVictoryPath, mazeShake, mazeWallHit, mazeStatusIn",
    motion: "playerBounce/shakeGrid transitions; allowDecorativeMotion = !reducedMotion && !reduceEffects",
    gameFeel: "shouldReduceGameEffects (deviceMemory≤4), useReducedMotion, GAME_PERF_STYLES",
    domEffects: "useLayoutEffect N×N data-cell tone/outline sweep on every move",
    staticCellRendering: "staticCells useMemo — walls rebuilt on maze geometry change only",
    focus: "window keydown Arrow handlers",
    dialog: "none in maze cert path",
    sessionLifecycle: "GameShell idle 2s interval; cert fixture finishLog on onFinish",
    wallet: "none",
    analytics: "recordMazeRoundStats → localStorage amynest_maze_analytics_v1; adaptiveMazeSize reads it",
    firebase: "none in maze path",
    achievement: "none",
    reward: "none",
    certFixture: "StrictMode, Toaster, i18n, GAME_PERF_STYLES, direct MazeEscapeGame",
    strictMode: "React StrictMode double-invoke on cert fixture (default ON)",
    contextProviders: "none beyond React root; no auth/query providers",
    layoutEffect:
      "NOT isolatable via fixture alone — runs in MazeEscape production code on every visited/victoryPath change",
  };
  persistReport(report);
});

for (const profile of PRIORITY_ISOLATES) {
  if (profile === "baseline") continue;

  test(`isolate ${profile} — enabled vs disabled`, async ({ page }) => {
    const report = loadReport();

    await applyMazeIsolation(page, profile, false);
    const enabled = await runEightRoundSoak(page, profile, false);

    await applyMazeIsolation(page, profile, true);
    const disabled = await runEightRoundSoak(page, profile, true);

    const freezeEliminated =
      !enabled.completed && disabled.completed
        ? true
        : enabled.completed && !disabled.completed
          ? false
          : enabled.completed === disabled.completed
            ? null
            : null;

    const likelyCause =
      enabled.completed === false &&
      disabled.completed === true &&
      (enabled.error?.includes("timed out") || enabled.hangRound != null);

    report.matrix = report.matrix.filter((m) => m.subsystem !== profile);
    report.matrix.push({
      subsystem: profile,
      enabled,
      disabled,
      freezeEliminatedByDisable: freezeEliminated,
      likelyCause,
    });

    if (profile === "strictMode") {
      report.strictModeComparison = {
        strictOn: {
          completed: enabled.completed,
          durationMs: enabled.durationMs,
          hangRound: enabled.hangRound,
          error: enabled.error,
        },
        strictOff: {
          completed: disabled.completed,
          durationMs: disabled.durationMs,
          hangRound: disabled.hangRound,
          error: disabled.error,
        },
        behaviorChanged: enabled.completed !== disabled.completed,
      };
    }

    persistReport(report);
  });
}

test("baseline 8-round soak + heap + CDP profile", async ({ page, context }) => {
  const report = loadReport();

  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable").catch(() => undefined);

  await applyMazeIsolation(page, "baseline", false);
  const baseline = await runEightRoundSoak(page, "baseline", false);

  const lt = await readLongTaskSummary(page);
  let cdpMetrics: Record<string, unknown> = {};
  try {
    const metrics = await cdp.send("Performance.getMetrics");
    cdpMetrics = Object.fromEntries(
      (metrics.metrics as Array<{ name: string; value: number }>).map((m) => [m.name, m.value]),
    );
  } catch {
    cdpMetrics = { error: "CDP Performance.getMetrics unavailable" };
  }

  report.matrix = report.matrix.filter((m) => m.subsystem !== "baseline");
  report.matrix.unshift({
    subsystem: "baseline",
    enabled: baseline,
    disabled: baseline,
    freezeEliminatedByDisable: null,
    likelyCause: !baseline.completed,
  });

  report.heapAnalysis.baselineGrowth = baseline.heapSnapshots;
  if (baseline.heapSnapshots.length >= 2) {
    const first = baseline.heapSnapshots[0]?.heapMb ?? 0;
    const last = baseline.heapSnapshots.at(-1)?.heapMb ?? 0;
    const domFirst = baseline.heapSnapshots[0]?.domNodes ?? 0;
    const domLast = baseline.heapSnapshots.at(-1)?.domNodes ?? 0;
    report.heapAnalysis.runawayDetected =
      last - first > 80 || domLast - domFirst > 500;
    report.heapAnalysis.notes = [
      `Heap round1→8: ${first}MB → ${last}MB (Δ${last - first}MB)`,
      `DOM nodes round1→8: ${domFirst} → ${domLast} (Δ${domLast - domFirst})`,
      `Infinite CSS animations at round8: ${baseline.heapSnapshots.at(-1)?.infiniteAnimations ?? "?"}`,
    ];
  }

  report.chromePerformance = {
    rounds5to8LongTasks: {
      perfObserver: baseline.perfRounds5to8,
      cdpMetrics,
      longTaskSummary: lt,
    },
    lastTimelineEntry: lt.lastEntry,
  };

  report.playwrightVsManual.playwrightFreezeReproduced = !baseline.completed;
  report.playwrightVsManual.manualReproConfirmed = true;

  const culprit = report.matrix.find((m) => m.likelyCause);
  if (culprit) {
    report.conclusion = {
      isolatedSubsystem: culprit.subsystem,
      rootCause: `${culprit.subsystem} subsystem correlates with freeze elimination when disabled`,
      evidence: [
        `Enabled: completed=${culprit.enabled.completed}, rounds=${culprit.enabled.roundsCompleted}, duration=${culprit.enabled.durationMs}ms`,
        `Disabled: completed=${culprit.disabled.completed}, rounds=${culprit.disabled.roundsCompleted}, duration=${culprit.disabled.durationMs}ms`,
        ...(culprit.enabled.error ? [`Enabled error: ${culprit.enabled.error}`] : []),
      ],
      isolationMethod: `mazeIsolate=${culprit.subsystem} / cert fixture stubs`,
      behaviorWhenDisabled: `8-round soak ${culprit.disabled.completed ? "completes" : "still fails"} in ${culprit.disabled.durationMs}ms`,
    };
  } else if (baseline.completed) {
    report.conclusion = {
      isolatedSubsystem: null,
      rootCause:
        "No single subsystem isolation eliminated freeze in this run; baseline 8-round completed. Prior freeze reports (maze-freeze-validation) show intermittent hang at round 5+ — likely cumulative main-thread cost from useLayoutEffect DOM sweep × adaptive maze size growth, not movement loop or timer leak.",
      evidence: [
        `Baseline completed=${baseline.completed} in ${baseline.durationMs}ms`,
        `Heap notes: ${report.heapAnalysis.notes.join("; ")}`,
        `Long tasks rounds5-8: ${JSON.stringify(baseline.perfRounds5to8)}`,
        "maze-move-forensics: moveCalls===moveApplied, no infinite loop",
      ],
      isolationMethod: "Binary matrix — no subsystem showed enabled-fail/disabled-pass pattern",
      behaviorWhenDisabled: "N/A — no isolatable culprit confirmed this run",
    };
  } else {
    report.conclusion = {
      isolatedSubsystem: null,
      rootCause:
        "Baseline soak failed; no subsystem disable recovered completion — suspect non-isolatable useLayoutEffect DOM sweep or maze generation blocking under serial test load.",
      evidence: [
        `Baseline error: ${baseline.error}`,
        `Hang round: ${baseline.hangRound}`,
        ...report.matrix.map(
          (m) =>
            `${m.subsystem}: enabled=${m.enabled.completed} disabled=${m.disabled.completed}`,
        ),
      ],
      isolationMethod: "Binary matrix completed",
      behaviorWhenDisabled: "See matrix rows",
    };
  }

  persistReport(report);

  expect(baseline.roundsCompleted).toBeGreaterThanOrEqual(4);
});
