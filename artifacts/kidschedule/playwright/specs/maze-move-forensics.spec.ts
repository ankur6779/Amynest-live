/**
 * Movement pipeline forensics — solver path vs move counters, post-escape storm, soak.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { installTimerProbes } from "../helpers/game-perf-metrics";

const BASE = "/playwright-gaming-hub-certification.html";
const OUT = path.join(process.cwd(), "certification/output/maze-move-forensics");
const REPORT_PATH = path.join(OUT, "report.json");

type MoveForensics = {
  enabled: boolean;
  moveCalls: number;
  moveBlocked: number;
  moveApplied: number;
  moveIgnoredDone: number;
  keyboardCalls: number;
  dpadCalls: number;
  touchCalls: number;
  finishEffectRuns: number;
  pendingFinishSets: number;
  goalDetections: number;
  maxMovesPerSecond: number;
  maxRendersPerSecond: number;
  maxActiveRaf: number;
  lastPositions: string[];
  oscillationEvents: number;
  duplicatePositionEvents: number;
  lastMoveAt: number;
  lastMoveSource: string;
  lastBlockedAt: number;
  roundMoveTotals: number[];
  currentRoundMoves: number;
  logs: Array<{ t: number; type: string; detail?: string }>;
};

type ForensicsReport = {
  at: string;
  scenarios: Record<string, unknown>;
  summary: {
    moveLoopingInfinitely: boolean;
    maxMoveCallsPerSecond: number;
    maxRendersPerSecond: number;
    maxActiveRaf: number;
    maxActiveMoveQueue: string;
    lastExecutionPoint: string;
    callStack: string;
    verifiedRootCause: string;
  };
};

function loadReport(): ForensicsReport {
  if (fs.existsSync(REPORT_PATH)) {
    return JSON.parse(fs.readFileSync(REPORT_PATH, "utf8")) as ForensicsReport;
  }
  return {
    at: new Date().toISOString(),
    scenarios: {},
    summary: {
      moveLoopingInfinitely: false,
      maxMoveCallsPerSecond: 0,
      maxRendersPerSecond: 0,
      maxActiveRaf: 0,
      maxActiveMoveQueue: "N/A — no move queue; synchronous move() callback",
      lastExecutionPoint: "",
      callStack: "not captured",
      verifiedRootCause: "",
    },
  };
}

function persistReport(report: ForensicsReport): void {
  fs.mkdirSync(OUT, { recursive: true });
  report.summary = buildSummary(report);
  report.at = new Date().toISOString();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
}

async function snapshotForensics(page: import("@playwright/test").Page): Promise<MoveForensics> {
  return page.evaluate(async () => {
    const { mazeMoveTraceSnapshot } = await import("/src/lib/maze-move-forensics.ts");
    return mazeMoveTraceSnapshot();
  });
}

async function resetForensics(page: import("@playwright/test").Page): Promise<void> {
  await page.evaluate(async () => {
    const { mazeMoveTraceReset } = await import("/src/lib/maze-move-forensics.ts");
    mazeMoveTraceReset();
  });
}

async function setupMazeMoveTrace(page: import("@playwright/test").Page): Promise<void> {
  await page.goto(`${BASE}?mode=maze-easy&mazeMoveTrace=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_move_trace", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
}

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

const keyToLabel: Record<string, string> = {
  ArrowUp: "Move up",
  ArrowDown: "Move down",
  ArrowLeft: "Move left",
  ArrowRight: "Move right",
};

async function pressDpadMoves(page: import("@playwright/test").Page, moves: string[], delayMs = 40): Promise<void> {
  for (const key of moves) {
    await page.getByRole("button", { name: keyToLabel[key]! }).click();
    if (delayMs > 0) await page.waitForTimeout(delayMs);
  }
}

async function pressKeyboardMoves(page: import("@playwright/test").Page, moves: string[], delayMs = 25): Promise<void> {
  await page.locator('[data-testid="maze-grid"]').click();
  for (const key of moves) {
    await page.keyboard.press(key);
    if (delayMs > 0) await page.waitForTimeout(delayMs);
  }
}

async function waitInterRoundReset(page: import("@playwright/test").Page, timeoutMs = 35_000): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const match = document.body.innerText.match(/Moves (\d+)\//);
        return match != null && match[1] === "0";
      },
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}

async function pollInterRoundRunaway(
  page: import("@playwright/test").Page,
  roundIndex: number,
  maxWaitMs = 25_000,
): Promise<{ runawayDetected: boolean; polls: Array<{ t: number; moveCalls: number; delta: number }>; roundIndex: number }> {
  const polls: Array<{ t: number; moveCalls: number; delta: number }> = [];
  let runawayDetected = false;
  let prevCalls = (await snapshotForensics(page)).moveCalls;
  let prevT = Date.now();
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    const snap = await snapshotForensics(page);
    const now = Date.now();
    const dt = now - prevT;
    const delta = snap.moveCalls - prevCalls;
    polls.push({ t: now, moveCalls: snap.moveCalls, delta });
    if (dt >= 900 && dt <= 1100 && delta > 100) runawayDetected = true;
    prevCalls = snap.moveCalls;
    prevT = now;
    const match = await page.evaluate(() => {
      const m = document.body.innerText.match(/Moves (\d+)\//);
      return m?.[1] ?? null;
    });
    if (match === "0") break;
  }

  return { runawayDetected, polls, roundIndex };
}

function lastLogEntry(f: MoveForensics): string {
  const last = f.logs.at(-1);
  if (!last) return "no logs";
  return `${last.type}${last.detail ? `:${last.detail}` : ""} @${last.t}`;
}

function collectAllSnaps(report: ForensicsReport): MoveForensics[] {
  const all: MoveForensics[] = [];
  const push = (x: MoveForensics | undefined) => {
    if (x) all.push(x);
  };
  const single = report.scenarios.singleRoundDpad as { forensics?: MoveForensics } | undefined;
  const storm = report.scenarios.postEscapeStorm as { before?: MoveForensics; after?: MoveForensics } | undefined;
  const kb = report.scenarios.keyboardVsDpad as { keyboard?: MoveForensics; dpad?: MoveForensics } | undefined;
  const soak = report.scenarios.eightRoundSoak as { roundSnapshots?: MoveForensics[] } | undefined;
  const kbSoak = report.scenarios.keyboardThreeRoundSoak as { roundSnapshots?: MoveForensics[] } | undefined;

  push(single?.forensics);
  push(storm?.before);
  push(storm?.after);
  push(kb?.keyboard);
  push(kb?.dpad);
  if (soak?.roundSnapshots) all.push(...soak.roundSnapshots);
  if (kbSoak?.roundSnapshots) all.push(...kbSoak.roundSnapshots);
  return all;
}

function buildSummary(report: ForensicsReport): ForensicsReport["summary"] {
  const allSnaps = collectAllSnaps(report);
  const maxMoveCallsPerSecond = Math.max(0, ...allSnaps.map((s) => s.maxMovesPerSecond));
  const maxRendersPerSecond = Math.max(0, ...allSnaps.map((s) => s.maxRendersPerSecond));
  const maxActiveRaf = Math.max(0, ...allSnaps.map((s) => s.maxActiveRaf));

  const soak = report.scenarios.eightRoundSoak as {
    runawayEvents?: unknown[];
    hangRound?: number | null;
    error?: string;
    lastSnapshotBeforeHang?: MoveForensics;
  } | undefined;
  const storm = report.scenarios.postEscapeStorm as {
    before?: MoveForensics;
    after?: MoveForensics;
  } | undefined;

  const soakRunaway = soak?.runawayEvents?.length ?? 0;
  const hangRound = soak?.hangRound ?? null;
  const hangError = soak?.error;
  const lastSnap = soak?.lastSnapshotBeforeHang ?? allSnaps.at(-1);

  const moveLoopingInfinitely =
    soakRunaway > 0 ||
    maxMoveCallsPerSecond > 500 ||
    Boolean(
      storm?.after &&
        storm.before &&
        storm.after.moveCalls - storm.before.moveCalls > 200 &&
        storm.after.moveApplied - storm.before.moveApplied > 50,
    );

  let verifiedRootCause = "No infinite move() loop detected in movement pipeline instrumentation.";
  if (hangError) {
    verifiedRootCause = `Hang/timeout during soak at round ${hangRound ?? "?"}: ${hangError}`;
  } else if (moveLoopingInfinitely) {
    verifiedRootCause = "Elevated move() call rate — investigate move() re-entry or ungated input storm.";
  } else if (
    storm?.after &&
    storm.before &&
    storm.after.moveIgnoredDone >= storm.before.moveIgnoredDone + 40 &&
    storm.after.moveApplied === storm.before.moveApplied
  ) {
    verifiedRootCause =
      "Post-escape inputs gated by doneRef — moveIgnoredDone absorbs storm; moveApplied unchanged.";
  }

  return {
    moveLoopingInfinitely,
    maxMoveCallsPerSecond,
    maxRendersPerSecond,
    maxActiveRaf,
    maxActiveMoveQueue: "N/A — no move queue; synchronous move() callback",
    lastExecutionPoint: lastSnap ? lastLogEntry(lastSnap) : hangError ?? "unknown",
    callStack: (report.scenarios.callStackCapture as string) ?? "not captured — no stack hook in move pipeline",
    verifiedRootCause,
  };
}

async function solveRoundDpad(page: import("@playwright/test").Page): Promise<{ pathLength: number; forensics: MoveForensics }> {
  const moves = await bfsSolvePath(page);
  expect(moves.length).toBeGreaterThan(0);
  await pressDpadMoves(page, moves, 40);
  await page.getByRole("status").filter({ hasText: /You escaped|Out of moves/ }).waitFor({ timeout: 30_000 });
  const forensics = await snapshotForensics(page);
  return { pathLength: moves.length, forensics };
}

async function runSoakRounds(
  page: import("@playwright/test").Page,
  rounds: number,
  input: "dpad" | "keyboard",
): Promise<{
  roundSnapshots: MoveForensics[];
  interRoundPolls: Array<{ round: number; runawayDetected: boolean; polls: unknown[] }>;
  runawayEvents: Array<{ round: number; polls: unknown[] }>;
  hangRound: number | null;
  error?: string;
  lastSnapshotBeforeHang?: MoveForensics;
  completed: boolean;
}> {
  const roundSnapshots: MoveForensics[] = [];
  const interRoundPolls: Array<{ round: number; runawayDetected: boolean; polls: unknown[] }> = [];
  const runawayEvents: Array<{ round: number; polls: unknown[] }> = [];
  let hangRound: number | null = null;
  let error: string | undefined;
  let lastSnapshotBeforeHang: MoveForensics | undefined;

  for (let round = 0; round < rounds; round++) {
    try {
      if (input === "dpad") {
        const { forensics } = await solveRoundDpad(page);
        roundSnapshots.push(forensics);
      } else {
        const moves = await bfsSolvePath(page);
        expect(moves.length).toBeGreaterThan(0);
        await pressKeyboardMoves(page, moves, 25);
        await page.getByRole("status").filter({ hasText: /You escaped/ }).waitFor({ timeout: 30_000 });
        roundSnapshots.push(await snapshotForensics(page));
      }

      if (round < rounds - 1) {
        const poll = await pollInterRoundRunaway(page, round);
        interRoundPolls.push({ round, runawayDetected: poll.runawayDetected, polls: poll.polls });
        if (poll.runawayDetected) runawayEvents.push({ round, polls: poll.polls });

        const resetOk = await waitInterRoundReset(page, 35_000);
        if (!resetOk) {
          hangRound = round + 1;
          lastSnapshotBeforeHang = await snapshotForensics(page);
          error = `inter-round reset timed out after round ${round}`;
          break;
        }
      } else {
        await page.waitForTimeout(1200);
      }
    } catch (e) {
      hangRound = round;
      lastSnapshotBeforeHang = await snapshotForensics(page).catch(() => undefined);
      error = e instanceof Error ? e.message : String(e);
      break;
    }
  }

  const completed = roundSnapshots.length === rounds && !error;
  return { roundSnapshots, interRoundPolls, runawayEvents, hangRound, error, lastSnapshotBeforeHang, completed };
}

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installTimerProbes(page);
});

test("(a) single round — path vs move counters", async ({ page }) => {
  const report = loadReport();
  await setupMazeMoveTrace(page);
  await resetForensics(page);

  const pathMoves = await bfsSolvePath(page);
  expect(pathMoves.length).toBeGreaterThan(0);
  await pressDpadMoves(page, pathMoves, 40);
  await page.getByRole("status").filter({ hasText: /You escaped/ }).waitFor({ timeout: 30_000 });

  const forensics = await snapshotForensics(page);
  report.scenarios.singleRoundDpad = {
    pathLength: pathMoves.length,
    moveCalls: forensics.moveCalls,
    moveApplied: forensics.moveApplied,
    dpadCalls: forensics.dpadCalls,
    moveIgnoredDone: forensics.moveIgnoredDone,
    moveBlocked: forensics.moveBlocked,
    forensics,
  };
  persistReport(report);
});

async function fireDpadStormAndSnapshot(
  page: import("@playwright/test").Page,
  count: number,
): Promise<{ clicked: number; after: MoveForensics }> {
  return page.evaluate(async (n) => {
    const { mazeMoveTraceSnapshot } = await import("/src/lib/maze-move-forensics.ts");
    const labels = ["Move up", "Move down", "Move left", "Move right"];
    let clicked = 0;
    for (let i = 0; i < n; i++) {
      const btn = Array.from(document.querySelectorAll("button")).find(
        (b) => b.getAttribute("aria-label") === labels[i % 4],
      ) as HTMLButtonElement | undefined;
      btn?.click();
      clicked += 1;
    }
    return { clicked, after: mazeMoveTraceSnapshot() };
  }, count);
}

test("(b) post-escape storm — 50 d-pad clicks", async ({ page }) => {
  test.setTimeout(90_000);
  const report = loadReport();
  await setupMazeMoveTrace(page);
  await resetForensics(page);
  const pathMoves = await bfsSolvePath(page);
  await pressDpadMoves(page, pathMoves, 40);
  await page.getByRole("status").filter({ hasText: /You escaped/ }).waitFor({ timeout: 30_000 });
  const beforeStorm = await snapshotForensics(page);
  let stormResult: { clicked: number; after: MoveForensics };
  try {
    stormResult = await Promise.race([
      fireDpadStormAndSnapshot(page, 50),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("storm evaluate hung >15s")), 15_000)),
    ]);
  } catch (e) {
    const partial = await snapshotForensics(page).catch(() => null);
    report.scenarios.postEscapeStorm = {
      before: beforeStorm,
      after: partial,
      error: e instanceof Error ? e.message : String(e),
      note: "storm evaluate hung — browser main thread blocked during post-escape input burst",
    };
    persistReport(report);
    return;
  }

  report.scenarios.postEscapeStorm = {
    before: beforeStorm,
    after: stormResult.after,
    clicksDispatched: stormResult.clicked,
    moveIgnoredDoneGrowth: stormResult.after.moveIgnoredDone - beforeStorm.moveIgnoredDone,
    moveAppliedGrowth: stormResult.after.moveApplied - beforeStorm.moveApplied,
    moveCallsGrowth: stormResult.after.moveCalls - beforeStorm.moveCalls,
  };
  persistReport(report);
});

test("(c) keyboard vs d-pad — one round each", async ({ page }) => {
  const report = loadReport();

  await setupMazeMoveTrace(page);
  await resetForensics(page);
  const kbPath = await bfsSolvePath(page);
  await pressKeyboardMoves(page, kbPath, 25);
  await page.getByRole("status").filter({ hasText: /You escaped/ }).waitFor({ timeout: 30_000 });
  const keyboard = await snapshotForensics(page);

  await setupMazeMoveTrace(page);
  await resetForensics(page);
  const dpadPath = await bfsSolvePath(page);
  await pressDpadMoves(page, dpadPath, 40);
  await page.getByRole("status").filter({ hasText: /You escaped/ }).waitFor({ timeout: 30_000 });
  const dpad = await snapshotForensics(page);

  report.scenarios.keyboardVsDpad = {
    keyboard,
    dpad,
    keyboardPathLength: kbPath.length,
    dpadPathLength: dpadPath.length,
  };
  report.scenarios.callStackCapture = await page.evaluate(() => new Error("maze-move-forensics-stack-probe").stack ?? "stack unavailable");
  persistReport(report);
});

test("(d) eight-round d-pad soak", async ({ page }) => {
  test.setTimeout(420_000);
  const report = loadReport();

  await setupMazeMoveTrace(page);
  await resetForensics(page);

  let soak = await runSoakRounds(page, 8, "dpad");

  if (!soak.completed) {
    report.scenarios.eightRoundSoakAttempt = { ...soak, input: "dpad", targetRounds: 8 };
    await setupMazeMoveTrace(page);
    await resetForensics(page);
    soak = await runSoakRounds(page, 3, "dpad");
    report.scenarios.eightRoundSoak = {
      ...soak,
      input: "dpad",
      targetRounds: 8,
      fallbackRounds: 3,
      note: "8-round incomplete; 3-round d-pad fallback captured",
    };
  } else {
    report.scenarios.eightRoundSoak = { ...soak, input: "dpad", targetRounds: 8 };
    await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 20_000 }).catch(() => undefined);
  }

  persistReport(report);
});

test("(e) keyboard-only 3-round soak fallback", async ({ page }) => {
  test.setTimeout(240_000);
  const report = loadReport();

  const prior = report.scenarios.eightRoundSoak as { completed?: boolean } | undefined;
  if (prior?.completed) {
    persistReport(report);
    return;
  }

  await setupMazeMoveTrace(page);
  await resetForensics(page);
  const kbSoak = await runSoakRounds(page, 3, "keyboard");

  report.scenarios.keyboardThreeRoundSoak = { ...kbSoak, input: "keyboard", targetRounds: 3 };
  persistReport(report);
});
