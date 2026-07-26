/**
 * Maze purity validation — 8-round session, 10 replays, 20-replay stress.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { installTimerProbes } from "../helpers/game-perf-metrics";

const BASE = "/playwright-gaming-hub-certification.html";
const OUT = path.join(process.cwd(), "certification/output/maze-freeze-validation");

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
  expect(moves.length).toBeGreaterThan(0);
  const labels: Record<string, string> = {
    ArrowUp: "Move up",
    ArrowDown: "Move down",
    ArrowLeft: "Move left",
    ArrowRight: "Move right",
  };
  for (const key of moves) {
    await page.getByRole("button", { name: labels[key]! }).click();
    await page.waitForTimeout(50);
  }
  await page.getByRole("status").filter({ hasText: /You escaped|Out of moves/ }).waitFor({ timeout: 35_000 });
  if (roundIndex < 7) {
    await page.waitForTimeout(1500);
    await expect(page.getByText(/Moves 0\//)).toBeVisible({ timeout: 20_000 });
  } else {
    await page.waitForTimeout(1700);
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
  for (let r = 0; r < 8; r++) await solveRound(page, r);
  await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 30_000 });
  return page.evaluate(() => {
    const d = (window as Window & { __mazeDebug?: Record<string, number> }).__mazeDebug;
    const t = (window as Window & { __ghTimers?: { timeouts: number; intervals: number } }).__ghTimers;
    return {
      onFinishCalls: d?.onFinishCalls ?? -1,
      loadRoundCalls: d?.loadRoundCalls ?? -1,
      finishTimerFromUpdater: d?.finishTimerFromUpdaterCount ?? -1,
      timeouts: t?.timeouts ?? -1,
      intervals: t?.intervals ?? -1,
    };
  });
}

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installTimerProbes(page);
});

test("2-round maze smoke", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  for (let r = 0; r < 2; r++) await solveRound(page, r);
});

test("8-round maze session completes", async ({ page }) => {
  test.setTimeout(240_000);
  const snap = await fullSession(page);
  expect(snap.onFinishCalls).toBe(1);
  expect(snap.loadRoundCalls).toBeGreaterThanOrEqual(8);
  expect(snap.finishTimerFromUpdater).toBe(0);
  expect(snap.timeouts).toBeLessThanOrEqual(6);
});

test("10 replay sessions", async ({ page }) => {
  test.setTimeout(600_000);
  const results = [];
  for (let i = 0; i < 10; i++) {
    results.push(await fullSession(page));
    await page.goto("about:blank");
    await page.waitForTimeout(100);
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "ten-replays.json"), JSON.stringify(results, null, 2));
  for (const snap of results) {
    expect(snap.onFinishCalls).toBe(1);
    expect(snap.finishTimerFromUpdater).toBe(0);
  }
});

test("20 replay stress", async ({ page }) => {
  test.setTimeout(900_000);
  let maxTimeouts = 0;
  for (let i = 0; i < 20; i++) {
    const snap = await fullSession(page);
    maxTimeouts = Math.max(maxTimeouts, snap.timeouts);
    expect(snap.onFinishCalls).toBe(1);
    expect(snap.finishTimerFromUpdater).toBe(0);
    await page.goto("about:blank");
    await page.waitForTimeout(80);
  }
  expect(maxTimeouts).toBeLessThanOrEqual(8);
});
