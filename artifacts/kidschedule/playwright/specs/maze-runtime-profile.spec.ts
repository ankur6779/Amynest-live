/**
 * 8-round browser profile + yield experiment comparison.
 */
import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";

const BASE = "/playwright-gaming-hub-certification.html";
const OUT = path.join(process.cwd(), "certification/output/maze-runtime-profile");

async function installProbes(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const w = window as Window & {
      __mazeLongTasks?: Array<{ duration: number; start: number; name?: string }>;
    };
    w.__mazeLongTasks = [];
    try {
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) {
          w.__mazeLongTasks!.push({ duration: e.duration, start: e.startTime, name: e.name });
        }
      });
      obs.observe({ type: "longtask", buffered: true } as PerformanceObserverInit);
    } catch {
      /* optional */
    }
  });
}

async function solveOneRound(page: import("@playwright/test").Page) {
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
    const hw = (r: number, c: number, dir: string) => {
      const bs = (cell: HTMLElement, side: string) => {
        const cs = getComputedStyle(cell);
        const w = parseFloat(side === "right" ? cs.borderRightWidth : cs.borderBottomWidth);
        if (w < 2) return false;
        const col = side === "right" ? cs.borderRightColor : cs.borderBottomColor;
        return col !== "rgba(0, 0, 0, 0)" && !col.endsWith(", 0)");
      };
      if (dir === "right") {
        if (c >= last) return true;
        const cell = grid.querySelector(`[data-cell="${r},${c}"]`) as HTMLElement;
        return !cell || bs(cell, "right");
      }
      if (dir === "left") {
        if (c <= 0) return true;
        const cell = grid.querySelector(`[data-cell="${r},${c - 1}"]`) as HTMLElement;
        return !cell || bs(cell, "right");
      }
      if (dir === "down") {
        if (r >= last) return true;
        const cell = grid.querySelector(`[data-cell="${r},${c}"]`) as HTMLElement;
        return !cell || bs(cell, "bottom");
      }
      if (r <= 0) return true;
      const cell = grid.querySelector(`[data-cell="${r - 1},${c}"]`) as HTMLElement;
      return !cell || bs(cell, "bottom");
    };
    type N = { r: number; c: number; p: string[] };
    const q: N[] = [{ r: 0, c: 0, p: [] }];
    const seen = new Set(["0,0"]);
    for (const [d, k] of [["up", "ArrowUp"], ["down", "ArrowDown"], ["left", "ArrowLeft"], ["right", "ArrowRight"]] as const) {
      /* BFS inlined below */
    }
    const dirs = [
      { d: "up", k: "ArrowUp" },
      { d: "down", k: "ArrowDown" },
      { d: "left", k: "ArrowLeft" },
      { d: "right", k: "ArrowRight" },
    ];
    while (q.length) {
      const n = q.shift()!;
      if (n.r === last && n.c === last) return n.p;
      for (const { d, k } of dirs) {
        const nr = d === "up" ? n.r - 1 : d === "down" ? n.r + 1 : n.r;
        const nc = d === "left" ? n.c - 1 : d === "right" ? n.c + 1 : n.c;
        if (nr < 0 || nc < 0 || nr > last || nc > last) continue;
        if (hw(n.r, n.c, d)) continue;
        const key = `${nr},${nc}`;
        if (seen.has(key)) continue;
        seen.add(key);
        q.push({ r: nr, c: nc, p: [...n.p, k] });
      }
    }
    return [] as string[];
  });
  const labels: Record<string, string> = {
    ArrowUp: "Move up",
    ArrowDown: "Move down",
    ArrowLeft: "Move left",
    ArrowRight: "Move right",
  };
  for (const k of moves) {
    await page.getByRole("button", { name: labels[k]! }).click();
    await page.waitForTimeout(40);
  }
  await page.getByRole("status").filter({ hasText: /You escaped|Out of moves/ }).waitFor({ timeout: 35_000 });
  await page.waitForTimeout(1500);
}

async function runEightRounds(page: import("@playwright/test").Page, label: string) {
  await page.goto(`${BASE}?mode=maze-easy&mazeDebug=1`);
  await page.evaluate(async () => {
    const { enableMazeGenProfiling } = await import("/src/lib/maze-gen-profile.ts");
    enableMazeGenProfiling();
    localStorage.setItem("amynest_maze_debug", "1");
    localStorage.removeItem("amynest_maze_analytics_v1");
    (window as Window & { __mazeLayoutProfile?: unknown[] }).__mazeLayoutProfile = [];
    (window as Window & { __mazeLongTasks?: unknown[] }).__mazeLongTasks = [];
  });
  await page.reload();
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 45_000 });

  const hangAt: number | null = null;
  for (let r = 0; r < 8; r++) {
    await solveOneRound(page);
  }
  await expect(page.locator('[data-testid="gh-cert-finished"]')).toBeVisible({ timeout: 30_000 });

  return page.evaluate(async (runLabel) => {
    const { disableMazeGenProfiling, mazeGenProfileStats } = await import("/src/lib/maze-gen-profile.ts");
    const gen = disableMazeGenProfiling();
    const layout = (window as Window & { __mazeLayoutProfile?: Array<{ durationMs: number }> }).__mazeLayoutProfile ?? [];
    const lt = (window as Window & { __mazeLongTasks?: Array<{ duration: number }> }).__mazeLongTasks ?? [];
    const layoutMs = layout.map((l) => l.durationMs);
    return {
      label: runLabel,
      genStats: mazeGenProfileStats(gen),
      maxGenMs: gen.length ? Math.max(...gen.map((g) => g.durationMs)) : 0,
      maxAttempts: gen.length ? Math.max(...gen.map((g) => g.attempts)) : 0,
      layoutMaxMs: layoutMs.length ? Math.max(...layoutMs) : 0,
      layoutAvgMs: layoutMs.length ? layoutMs.reduce((a, b) => a + b, 0) / layoutMs.length : 0,
      layoutSamples: layout.length,
      longTaskMaxMs: lt.length ? Math.max(...lt.map((t) => t.duration)) : 0,
      longTasksOver50: lt.filter((t) => t.duration > 50).length,
      longTasksOver100: lt.filter((t) => t.duration > 100).length,
      longTasksOver250: lt.filter((t) => t.duration > 250).length,
      longTasksOver1000: lt.filter((t) => t.duration > 1000).length,
      topLongTasks: [...lt].sort((a, b) => b.duration - a.duration).slice(0, 5),
    };
  }, label);
}

test.describe.configure({ mode: "serial", timeout: 600_000 });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });
  await installProbes(page);
});

test("8-round Playwright profile", async ({ page }) => {
  test.setTimeout(600_000);
  fs.mkdirSync(OUT, { recursive: true });
  let result: Awaited<ReturnType<typeof runEightRounds>> | { error: string };
  try {
    result = await runEightRounds(page, "playwright-sync");
  } catch (e) {
    result = { error: e instanceof Error ? e.message : String(e) };
  }
  fs.writeFileSync(path.join(OUT, "eight-round-playwright.json"), JSON.stringify(result, null, 2));
});

test("yield experiment — 50 sync gens in browser", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto(`${BASE}?mode=maze-easy`);
  const sync = await page.evaluate(async () => {
    const { enableMazeGenProfiling, disableMazeGenProfiling, mazeGenProfileStats } = await import(
      "/src/lib/maze-gen-profile.ts"
    );
    const { generateValidatedMaze } = await import("/src/lib/maze-generator.ts");
    enableMazeGenProfiling();
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      generateValidatedMaze(5 + (i % 8), i % 3 === 2 ? "hard" : i % 3 === 1 ? "normal" : "easy");
    }
    const entries = disableMazeGenProfiling();
    return { wallMs: performance.now() - t0, stats: mazeGenProfileStats(entries) };
  });

  const yielded = await page.evaluate(async () => {
    const { enableMazeGenProfiling, disableMazeGenProfiling, mazeGenProfileStats } = await import(
      "/src/lib/maze-gen-profile.ts"
    );
    const { generateValidatedMazeYieldExperiment } = await import("/src/lib/maze-generator.ts");
    enableMazeGenProfiling();
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      await generateValidatedMazeYieldExperiment(5 + (i % 8), i % 3 === 2 ? "hard" : i % 3 === 1 ? "normal" : "easy");
    }
    const entries = disableMazeGenProfiling();
    return { wallMs: performance.now() - t0, stats: mazeGenProfileStats(entries) };
  });

  const report = { sync, yielded, at: new Date().toISOString() };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "yield-experiment.json"), JSON.stringify(report, null, 2));
});
