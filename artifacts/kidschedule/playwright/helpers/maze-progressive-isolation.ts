import type { Page } from "@playwright/test";
import {
  applyMazeIsolation,
  buildMazeUrl,
  type MazeIsolateProfile,
} from "./maze-isolation";

export type RoundSnapshot = {
  round: number;
  heapMb: number | null;
  domNodes: number;
  renderCount: number;
  activeTimeouts: number;
  activeIntervals: number;
  activeRaf: number;
  infiniteAnimations: number;
  lastLifecycleStage: string;
  layoutEffectTotalMs: number;
  layoutEffectCalls: number;
  cpuEstimateMs: number;
};

export type ExperimentResult = {
  profile: MazeIsolateProfile;
  disabled: boolean;
  runIndex: number;
  pass: boolean;
  roundsCompleted: number;
  freezeRound: number | null;
  lastCheckpoint: string | null;
  durationMs: number;
  abortedReason: string | null;
  roundSnapshots: RoundSnapshot[];
  heapDelta: number | null;
  domDelta: number | null;
  renderDelta: number | null;
};

const KEY_TO_LABEL: Record<string, string> = {
  ArrowUp: "Move up",
  ArrowDown: "Move down",
  ArrowLeft: "Move left",
  ArrowRight: "Move right",
};

const CLICK_MS = 50;
const HEARTBEAT_MS = 400;
const HEARTBEAT_FAIL_LIMIT = 3;
const INTER_ROUND_MS = 10_000;
const ROUND_SOLVE_MS = 15_000;
const ACTION_TIMEOUT_MS = 3_000;

function remainingMs(start: number, maxDurationMs: number): number {
  return Math.max(0, maxDurationMs - (Date.now() - start));
}

async function safeClick(page: Page, name: string, start: number, maxDurationMs: number): Promise<boolean> {
  const ms = Math.min(ACTION_TIMEOUT_MS, remainingMs(start, maxDurationMs));
  if (ms <= 0) return false;
  try {
    await page.getByRole("button", { name }).click({ timeout: ms });
    return true;
  } catch {
    return false;
  }
}

export async function installLifecycleBridge(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as Window & { __mazeHeartbeat?: { lastOk: number; failStreak: number } }).__mazeHeartbeat = {
      lastOk: Date.now(),
      failStreak: 0,
    };
  });
}

async function heartbeat(page: Page): Promise<boolean> {
  try {
    await page.evaluate(
      () => {
        const hb = (window as Window & { __mazeHeartbeat?: { lastOk: number; failStreak: number } })
          .__mazeHeartbeat!;
        hb.lastOk = Date.now();
        hb.failStreak = 0;
        return true;
      },
      { timeout: 1500 },
    );
    return true;
  } catch {
    return false;
  }
}

async function readLifecycle(page: Page): Promise<{
  lastCheckpoint: string | null;
  roundSnapshots: RoundSnapshot[];
}> {
  try {
    return await page.evaluate(() => {
      const lc = (
        window as Window & {
          __mazeLifecycle?: {
            lastCheckpoint: { name: string } | null;
            roundSnapshots: Array<{
              round: number;
              heapMb: number | null;
              domNodes: number;
              renderCount: number;
              activeTimeouts: number;
              activeIntervals: number;
              activeRaf: number;
              infiniteAnimations: number;
              lastLifecycleStage: string;
              layoutEffectTotalMs: number;
              layoutEffectCalls: number;
            }>;
          };
        }
      ).__mazeLifecycle;
      return {
        lastCheckpoint: lc?.lastCheckpoint?.name ?? null,
        roundSnapshots: (lc?.roundSnapshots ?? []).map((s) => ({
          ...s,
          cpuEstimateMs: 0,
        })),
      };
    }, { timeout: 2000 });
  } catch {
    return { lastCheckpoint: null, roundSnapshots: [] };
  }
}

async function bfsPath(page: Page, timeoutMs = 5000): Promise<string[]> {
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
  }, undefined, { timeout: timeoutMs });
}

function computeDeltas(snapshots: RoundSnapshot[]): {
  heapDelta: number | null;
  domDelta: number | null;
  renderDelta: number | null;
} {
  if (snapshots.length < 2) return { heapDelta: null, domDelta: null, renderDelta: null };
  const first = snapshots[0]!;
  const last = snapshots.at(-1)!;
  return {
    heapDelta:
      first.heapMb != null && last.heapMb != null ? last.heapMb - first.heapMb : null,
    domDelta: last.domNodes - first.domNodes,
    renderDelta: last.renderCount - first.renderCount,
  };
}

export async function runProgressiveExperiment(
  page: Page,
  profile: MazeIsolateProfile,
  disabled: boolean,
  runIndex: number,
  maxDurationMs: number,
): Promise<ExperimentResult> {
  return Promise.race([
    runProgressiveExperimentInner(page, profile, disabled, runIndex, maxDurationMs),
    new Promise<ExperimentResult>((resolve) => {
      setTimeout(async () => {
        const lc = await readLifecycle(page).catch(() => ({
          lastCheckpoint: null,
          roundSnapshots: [] as RoundSnapshot[],
        }));
        resolve({
          profile,
          disabled,
          runIndex,
          pass: false,
          roundsCompleted: 0,
          freezeRound: null,
          lastCheckpoint: lc.lastCheckpoint,
          durationMs: maxDurationMs,
          abortedReason: "hardTimeoutWrapper",
          roundSnapshots: lc.roundSnapshots,
          heapDelta: null,
          domDelta: null,
          renderDelta: null,
        });
      }, maxDurationMs + 2_000);
    }),
  ]);
}

async function runProgressiveExperimentInner(
  page: Page,
  profile: MazeIsolateProfile,
  disabled: boolean,
  runIndex: number,
  maxDurationMs: number,
): Promise<ExperimentResult> {
  const start = Date.now();
  let roundsCompleted = 0;
  let freezeRound: number | null = null;
  let lastCheckpoint: string | null = null;
  let abortedReason: string | null = null;
  let roundSnapshots: RoundSnapshot[] = [];
  let failStreak = 0;
  let lastHb = Date.now();

  const url = buildMazeUrl(profile, disabled);
  await page.goto(url, { timeout: 20_000 });
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload({ timeout: 20_000 });
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 20_000 });

  for (let round = 0; round < 8; round++) {
    if (Date.now() - start > maxDurationMs) {
      abortedReason = "maxDurationExceeded";
      freezeRound = roundsCompleted > 0 ? roundsCompleted : round;
      break;
    }

    const path = await bfsPath(page).catch(() => [] as string[]);
    if (path.length === 0) {
      abortedReason = "noSolverPath";
      freezeRound = round;
      break;
    }

    for (const key of path) {
      if (remainingMs(start, maxDurationMs) <= 0) {
        abortedReason = "maxDurationExceededDuringSolve";
        freezeRound = round + 1;
        break;
      }
      const clicked = await safeClick(page, KEY_TO_LABEL[key]!, start, maxDurationMs);
      if (!clicked) {
        const lc = await readLifecycle(page);
        lastCheckpoint = lc.lastCheckpoint;
        abortedReason = "clickTimeoutOrFreeze";
        freezeRound = round + 1;
        break;
      }
      await page.waitForTimeout(Math.min(CLICK_MS, remainingMs(start, maxDurationMs)));

      if (Date.now() - lastHb >= HEARTBEAT_MS) {
        lastHb = Date.now();
        const ok = await heartbeat(page);
        if (!ok) {
          failStreak += 1;
          const lc = await readLifecycle(page);
          lastCheckpoint = lc.lastCheckpoint;
          if (failStreak >= HEARTBEAT_FAIL_LIMIT) {
            abortedReason = "browserUnresponsive";
            freezeRound = round + 1;
            break;
          }
        } else {
          failStreak = 0;
        }
      }
    }

    if (abortedReason) break;

    try {
      await page
        .getByRole("status")
        .filter({ hasText: /You escaped|Out of moves/ })
        .waitFor({ timeout: ROUND_SOLVE_MS });
    } catch {
      const lc = await readLifecycle(page);
      lastCheckpoint = lc.lastCheckpoint;
      abortedReason = "escapeStatusTimeout";
      freezeRound = round + 1;
      break;
    }

    roundsCompleted = round + 1;

    await page.evaluate((r) => {
      const fn = (
        window as Window & { __mazeLifecycleCapture?: (n: number) => void }
      ).__mazeLifecycleCapture;
      if (typeof fn === "function") fn(r);
    }, roundsCompleted).catch(() => undefined);

    const lc = await readLifecycle(page);
    lastCheckpoint = lc.lastCheckpoint;
    roundSnapshots = lc.roundSnapshots;

    if (round < 7) {
      const interStart = Date.now();
      let resetOk = false;
      while (Date.now() - interStart < INTER_ROUND_MS) {
        if (Date.now() - start > maxDurationMs) {
          abortedReason = "maxDurationExceededInterRound";
          freezeRound = roundsCompleted;
          break;
        }
        const ok = await heartbeat(page);
        if (!ok) {
          failStreak += 1;
          const lc2 = await readLifecycle(page);
          lastCheckpoint = lc2.lastCheckpoint;
          if (failStreak >= HEARTBEAT_FAIL_LIMIT) {
            abortedReason = "browserUnresponsiveInterRound";
            freezeRound = roundsCompleted;
            break;
          }
        } else {
          failStreak = 0;
        }
        try {
          const movesZero = await page.evaluate(() => {
            const match = document.body.innerText.match(/Moves (\d+)\//);
            return match != null && match[1] === "0";
          }, { timeout: 1500 });
          if (movesZero) {
            resetOk = true;
            break;
          }
        } catch {
          /* keep polling */
        }
        await page.waitForTimeout(HEARTBEAT_MS);
      }
      if (abortedReason) break;
      if (!resetOk) {
        abortedReason = "interRoundResetTimeout";
        freezeRound = roundsCompleted;
        break;
      }
    } else {
      await page.waitForTimeout(800);
    }
  }

  const lcFinal = await readLifecycle(page);
  if (!lastCheckpoint) lastCheckpoint = lcFinal.lastCheckpoint;
  if (roundSnapshots.length === 0) roundSnapshots = lcFinal.roundSnapshots;

  const pass = roundsCompleted === 8 && !abortedReason;
  const deltas = computeDeltas(roundSnapshots);

  return {
    profile,
    disabled,
    runIndex,
    pass,
    roundsCompleted,
    freezeRound,
    lastCheckpoint,
    durationMs: Date.now() - start,
    abortedReason,
    roundSnapshots,
    ...deltas,
  };
}

export type TriRunVerdict = "PASS_PASS_PASS" | "FAIL_FAIL_FAIL" | "INCONCLUSIVE";

export function triRunVerdict(results: ExperimentResult[]): TriRunVerdict {
  if (results.length < 3) return "INCONCLUSIVE";
  const passes = results.map((r) => r.pass);
  if (passes.every(Boolean)) return "PASS_PASS_PASS";
  if (passes.every((p) => !p)) return "FAIL_FAIL_FAIL";
  return "INCONCLUSIVE";
}

export async function preparePage(page: Page, profile: MazeIsolateProfile, disabled: boolean): Promise<void> {
  await applyMazeIsolation(page, profile, disabled);
  await installLifecycleBridge(page);
}

export const PROGRESSIVE_PROFILES: MazeIsolateProfile[] = [
  "baseline",
  "decorative",
  "confetti",
  "analytics",
  "strictMode",
  "audio",
];

export const MAX_EXPERIMENT_MS = 60_000;
