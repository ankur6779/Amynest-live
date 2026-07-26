/**
 * Reproduce post-completion freeze — complete sessions, remount, measure timers + responsiveness.
 */
import { test, expect } from "@playwright/test";
import { installTimerProbes, measureGamePerf } from "../helpers/game-perf-metrics";

const BASE = "/playwright-gaming-hub-certification.html";

test.describe.configure({ mode: "serial", timeout: 180_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installTimerProbes(page);
});

async function completeBehaviorChoice(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}?mode=game:what-should-you-do`);
  await page.waitForSelector('[data-testid="gh-cert-game-what-should-you-do"]', { timeout: 30_000 });
  await page.waitForSelector("button.game-choice-a11y", { timeout: 15_000 });

  for (let round = 0; round < 8; round++) {
    await page.locator("button.game-choice-a11y").first().click();
    await page.waitForTimeout(1400);
  }

  await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 20_000 });
}

async function readTimers(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const t = (window as Window & { __ghTimers?: { timeouts: number; intervals: number; raf: number } }).__ghTimers;
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
    return {
      timeouts: t?.timeouts ?? -1,
      intervals: t?.intervals ?? -1,
      raf: t?.raf ?? -1,
      heapMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    };
  });
}

/** BFS-solve current maze from DOM wall borders, then press d-pad buttons. */
async function autoSolveMazeRound(page: import("@playwright/test").Page, roundIndex: number) {
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

  expect(moves.length, "maze solver must find exit path").toBeGreaterThan(0);
  const keyToLabel: Record<string, string> = {
    ArrowUp: "Move up",
    ArrowDown: "Move down",
    ArrowLeft: "Move left",
    ArrowRight: "Move right",
  };
  for (const key of moves) {
    await page.getByRole("button", { name: keyToLabel[key]! }).click();
    await page.waitForTimeout(80);
  }
  await page
    .getByRole("status")
    .filter({ hasText: /You escaped|Out of moves/ })
    .waitFor({ timeout: 25_000 });
  const statusText = (await page.getByRole("status").innerText()).trim();
  expect(statusText, "solver should reach exit before move limit").toContain("You escaped");
  if (roundIndex >= 7) {
    await page.waitForTimeout(1500);
    return;
  }
  // GameShell shows maze subtitle (not "Round X of Y"); wait for inter-round reset.
  await page.waitForFunction(
    () => {
      const match = document.body.innerText.match(/Moves (\d+)\//);
      return match != null && match[1] === "0";
    },
    { timeout: 30_000 },
  );
}

async function completeMazeSession(page: import("@playwright/test").Page, mode = "maze-easy") {
  await page.goto(`${BASE}?mode=${mode}`);
  await page.evaluate(() => localStorage.removeItem("amynest_maze_analytics_v1"));
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 30_000 });
  for (let round = 0; round < 8; round++) {
    await autoSolveMazeRound(page, round);
  }
  await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 20_000 });
}

test("rapid mid-feedback exit — orphaned timeout accumulation (Odd One Out)", async ({ page }) => {
  const timeoutSamples: number[] = [];

  for (let cycle = 0; cycle < 30; cycle++) {
    await page.goto(`${BASE}?mode=game:odd-one-out`);
    await page.waitForSelector("button.game-choice-a11y", { timeout: 20_000 });
    await page.locator("button.game-choice-a11y").first().click();
    await page.waitForTimeout(50);
    await page.goto("about:blank");
    await page.waitForTimeout(30);
    const snap = await readTimers(page);
    timeoutSamples.push(snap.timeouts);
  }

  const maxTimeouts = Math.max(...timeoutSamples);
  const last5 = timeoutSamples.slice(-5);
  const avgLast5 = last5.reduce((a, b) => a + b, 0) / last5.length;
  expect(maxTimeouts).toBeLessThanOrEqual(8);
  expect(avgLast5).toBeLessThanOrEqual(4);
});

test("two full Target Tap completions — interval cleared at finish", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  for (let session = 1; session <= 2; session++) {
    await page.goto(`${BASE}?mode=target-tap`);
    await page.waitForSelector('[data-testid="gh-cert-target-tap"]', { timeout: 30_000 });
    await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 120_000 });
    const timers = await readTimers(page);
    expect(timers.intervals).toBeLessThanOrEqual(2);
    await page.goto("about:blank");
  }
});

test("two full Behavior Choice completions — timer leak + main thread", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const snapshots: Record<string, unknown>[] = [];

  for (let session = 1; session <= 2; session++) {
    const before = await readTimers(page);
    await completeBehaviorChoice(page);
    await page.waitForTimeout(500);
    const afterFinish = await readTimers(page);
    const perf = await measureGamePerf(page, 2000);
    snapshots.push({ session, before, afterFinish, perf });
    await page.goto("about:blank");
    await page.waitForTimeout(200);
  }

  const last = snapshots[1] as {
    afterFinish: { intervals: number; timeouts: number };
    perf: { longTasksOver50: number; longestTaskMs: number };
  };
  expect(last.afterFinish.intervals).toBeLessThanOrEqual(2);
  expect(last.afterFinish.timeouts).toBeLessThanOrEqual(4);
  expect(last.perf.longTasksOver50).toBeLessThan(6);
  expect(last.perf.longestTaskMs).toBeLessThan(200);
});

test("two full Maze Escape completions — round timers + heap stable (4x CPU)", async ({
  page,
  context,
}) => {
  test.setTimeout(300_000);
  // Throttle optional — maze session soak validates timer/heap stability.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const snapshots: Record<string, unknown>[] = [];

  for (let session = 1; session <= 2; session++) {
    const before = await readTimers(page);
    await completeMazeSession(page, "maze-easy");
    await page.waitForTimeout(500);
    const afterFinish = await readTimers(page);
    const perf = await measureGamePerf(page, 2000);
    snapshots.push({ session, before, afterFinish, perf });
    await page.goto("about:blank");
    await page.waitForTimeout(200);
  }

  const last = snapshots[1] as {
    afterFinish: { intervals: number; timeouts: number };
    perf: { longTasksOver50: number; longestTaskMs: number; heapUsed: number; activeTimeoutEstimate: number };
  };
  expect(last.afterFinish.intervals).toBeLessThanOrEqual(2);
  expect(last.afterFinish.timeouts).toBeLessThanOrEqual(6);
  expect(last.perf.activeTimeoutEstimate).toBeLessThanOrEqual(6);
  expect(last.perf.longTasksOver50).toBeLessThan(8);
  expect(last.perf.longestTaskMs).toBeLessThan(250);
});

test("five maze-easy rounds — stall probe", async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  for (let round = 0; round < 5; round++) await autoSolveMazeRound(page, round);
});

test("six maze-easy rounds — stall probe", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  for (let round = 0; round < 6; round++) await autoSolveMazeRound(page, round);
});

test("eight maze-easy rounds — full session probe", async ({ page }) => {
  test.setTimeout(360_000);
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  for (let round = 0; round < 8; round++) await autoSolveMazeRound(page, round);
  await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 25_000 });
  const dbg = await page.evaluate(() => (window as Window & { __mazeDebug?: Record<string, number> }).__mazeDebug);
  expect(dbg?.onFinishCalls).toBe(1);
});

test("four maze-easy rounds — stall probe", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  for (let round = 0; round < 4; round++) {
    await autoSolveMazeRound(page, round);
  }
  const dbg = await page.evaluate(() => (window as Window & { __mazeDebug?: Record<string, unknown> }).__mazeDebug);
  const timers = await readTimers(page);
  await page.evaluate(({ dbg, timers }) => {
    (window as unknown as { __stallProbe?: unknown }).__stallProbe = { dbg, timers, rounds: 4 };
  }, { dbg, timers });
});

test("three maze-easy rounds — find stall point", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  for (let round = 0; round < 3; round++) {
    await autoSolveMazeRound(page, round);
  }
});

test("one full maze-easy session — d-pad solver (no debug)", async ({ page }) => {
  test.setTimeout(300_000);
  await page.goto(`${BASE}?mode=maze-easy`);
  await page.evaluate(() => localStorage.removeItem("amynest_maze_analytics_v1"));
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  for (let round = 0; round < 8; round++) {
    await autoSolveMazeRound(page, round);
  }
  await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 25_000 });
});

test("one full maze-easy session — keyboard solver (no CPU throttle)", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(() => {
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });
  await page.locator('[data-testid="maze-grid"]').click();

  for (let round = 0; round < 8; round++) {
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
    for (const key of moves) {
      await page.keyboard.press(key);
      await page.waitForTimeout(30);
    }
    await page.getByRole("status").filter({ hasText: /You escaped|Out of moves/ }).waitFor({ timeout: 30_000 });
    if (round < 7) {
      await page.waitForFunction(
        () => {
          const match = document.body.innerText.match(/Moves (\d+)\//);
          return match != null && match[1] === "0";
        },
        { timeout: 45_000 },
      );
    } else {
      await page.waitForTimeout(1600);
    }
  }

  await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 25_000 });
  const dbg = await page.evaluate(() => (window as Window & { __mazeDebug?: { onFinishCalls: number; loadRoundCalls: number; maxMazeGenMs: number } }).__mazeDebug);
  expect(dbg?.onFinishCalls).toBe(1);
  expect(dbg?.loadRoundCalls).toBeGreaterThanOrEqual(8);
});

test("maze round transition — one inter-round timer after escape", async ({ page }) => {
  await page.goto(`${BASE}?mode=maze-easy`);
  await page.evaluate(() => localStorage.removeItem("amynest_maze_analytics_v1"));
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 30_000 });
  await autoSolveMazeRound(page, 0);
  const timers = await readTimers(page);
  expect(timers.timeouts).toBeLessThanOrEqual(4);
  await expect(page.getByText(/Moves 0\//)).toBeVisible();
});
