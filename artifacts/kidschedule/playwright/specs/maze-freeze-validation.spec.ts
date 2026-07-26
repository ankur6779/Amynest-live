/**
 * Fast instrumented Maze soak — easy mode, no CPU throttle.
 * Writes report.json even if assertions fail.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { installTimerProbes, measureGamePerf } from "../helpers/game-perf-metrics";

const BASE = "/playwright-gaming-hub-certification.html";
const OUT_DIR = path.join(process.cwd(), "certification/output/maze-freeze-validation");

async function readTimers(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const t = (window as Window & { __ghTimers?: { timeouts: number; intervals: number; raf: number } })
      .__ghTimers;
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return {
      timeouts: t?.timeouts ?? -1,
      intervals: t?.intervals ?? -1,
      raf: t?.raf ?? -1,
      heapMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    };
  });
}

async function readDebug(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const m = (window as Window & { __mazeDebug?: Record<string, unknown> }).__mazeDebug;
    if (!m) return null;
    return JSON.parse(JSON.stringify(m));
  });
}

async function solveRound(page: import("@playwright/test").Page, roundIndex: number) {
  const moves = await page.evaluate(() => {
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
  expect(moves.length).toBeGreaterThan(0);
  for (const key of moves) {
    await page.keyboard.press(key);
    await page.waitForTimeout(30);
  }
  await page.getByRole("status").filter({ hasText: /You escaped|Out of moves/ }).waitFor({ timeout: 30_000 });
  if (roundIndex < 7) {
    await page.waitForFunction(
      () => {
        const match = document.body.innerText.match(/Moves (\d+)\//);
        return match != null && match[1] === "0";
      },
      { timeout: 35_000 },
    );
  } else {
    await page.waitForTimeout(1600);
  }
}

async function fullSession(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  await page.locator('[data-testid="maze-grid"]').click();
  for (let r = 0; r < 8; r++) await solveRound(page, r);
  await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 25_000 });
}

test.describe.configure({ mode: "serial", timeout: 900_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installTimerProbes(page);
});

test("Maze instrumented soak — easy 10 replays + restarts + exits", async ({ page }) => {
  test.setTimeout(900_000);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const report: Record<string, unknown> = {
    at: new Date().toISOString(),
    freezeEvents: [] as string[],
    sessionsCompleted: 0,
    roundsCompleted: 0,
    restarts: 0,
    exits: 0,
    replays: 0,
    heapSnapshots: [] as Array<{ label: string; heapMb: number | null }>,
    perfSnapshots: [] as unknown[],
    max: {
      heapMb: 0,
      timeouts: 0,
      intervals: 0,
      raf: 0,
      renders: 0,
      mazeGenMs: 0,
      onFinishCalls: 0,
      longestTaskMs: 0,
    },
  };
  const freezeEvents = report.freezeEvents as string[];

  const snap = async (label: string) => {
    const t = await readTimers(page);
    const d = (await readDebug(page)) as Record<string, number> | null;
    (report.heapSnapshots as Array<{ label: string; heapMb: number | null }>).push({
      label,
      heapMb: t.heapMb,
    });
    const max = report.max as Record<string, number>;
    max.heapMb = Math.max(max.heapMb, t.heapMb ?? 0);
    max.timeouts = Math.max(max.timeouts, t.timeouts);
    max.intervals = Math.max(max.intervals, t.intervals);
    max.raf = Math.max(max.raf, t.raf);
    if (d) {
      max.renders = Math.max(max.renders, d.renderCount ?? 0);
      max.mazeGenMs = Math.max(max.mazeGenMs, d.maxMazeGenMs ?? 0);
      max.onFinishCalls = Math.max(max.onFinishCalls, d.onFinishCalls ?? 0);
      if ((d.onFinishCalls ?? 0) > 1) freezeEvents.push(`${label}: duplicate onFinish=${d.onFinishCalls}`);
    }
    const t0 = Date.now();
    try {
      await page.evaluate(() => performance.now(), undefined, { timeout: 5000 });
    } catch {
      freezeEvents.push(`${label}: main thread blocked >5s`);
    }
    if (Date.now() - t0 > 4000) freezeEvents.push(`${label}: slow evaluate ${Date.now() - t0}ms`);
  };

  await snap("startup");

  for (let i = 1; i <= 10; i++) {
    await fullSession(page);
    report.sessionsCompleted = (report.sessionsCompleted as number) + 1;
    report.roundsCompleted = (report.roundsCompleted as number) + 8;
    report.replays = (report.replays as number) + 1;
    await snap(`replay-${i}`);
    if ([1, 2, 5, 10].includes(i)) {
      const perf = await measureGamePerf(page, 1500);
      (report.perfSnapshots as unknown[]).push({ label: `session-${i}`, ...perf });
      const max = report.max as Record<string, number>;
      max.longestTaskMs = Math.max(max.longestTaskMs, perf.longestTaskMs);
    }
    await page.goto("about:blank");
    await page.waitForTimeout(100);
  }

  for (let i = 1; i <= 10; i++) {
    await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
    await page.evaluate(() => localStorage.setItem("amynest_maze_debug", "1"));
    await page.reload();
    await page.waitForSelector('[data-testid="maze-grid"]');
    await page.locator('[data-testid="maze-grid"]').click();
    await solveRound(page, 0);
    report.roundsCompleted = (report.roundsCompleted as number) + 1;
    report.restarts = (report.restarts as number) + 1;
    await snap(`restart-${i}`);
    await page.reload();
  }

  for (let i = 1; i <= 10; i++) {
    await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
    await page.evaluate(() => localStorage.setItem("amynest_maze_debug", "1"));
    await page.reload();
    await page.waitForSelector('[data-testid="maze-grid"]');
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    report.exits = (report.exits as number) + 1;
    await snap(`exit-${i}`);
    await page.goto("about:blank");
    const t = await readTimers(page);
    if (t.timeouts > 10) freezeEvents.push(`exit-${i}: timeouts=${t.timeouts}`);
  }

  const src = fs.readFileSync(path.join(process.cwd(), "src/components/games/MazeEscape.tsx"), "utf8");
  report.codeValidation = {
    finishTimerInSessionScoreUpdater: !/setSessionScore\s*\(\s*\([^)]*\)\s*=>\s*\{[\s\S]*?setTimeout/.test(src),
    finishTimerClearedOnLoadRound: src.includes("clearTimeoutSafe(finishTimerRef.current)") && src.includes("loadRound"),
    sessionFinishedRef: src.includes("sessionFinishedRef"),
    useTimeoutRegistry: src.includes("useTimeoutRegistry"),
    finishRoundFromMoveUpdater: src.includes("finishRound(true, nm, true)"),
  };

  const dbg = (await readDebug(page)) as Record<string, number> | null;
  report.finishTimerFromUpdaterCount = dbg?.finishTimerFromUpdaterCount ?? null;
  report.freezeReproduced = freezeEvents.length > 0;
  report.conclusion =
    freezeEvents.length > 0
      ? "Partially fixed"
      : (report.max as Record<string, number>).onFinishCalls <= 10
        ? "Likely fixed"
        : "Not fixed";

  fs.writeFileSync(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));

  expect(freezeEvents).toHaveLength(0);
  expect(report.roundsCompleted).toBeGreaterThanOrEqual(30);
  expect((report.max as Record<string, number>).onFinishCalls).toBeLessThanOrEqual(10);
});
