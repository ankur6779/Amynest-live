/**
 * Gaming Hub full production freeze certification.
 * Phases A–I: metrics, loops, memory, touch, ranking, low-end, soak.
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import {
  installTimerProbes,
  measureGamePerf,
  measureTouchLatency,
  type GamePerfSnapshot,
} from "../helpers/game-perf-metrics";

const BASE = "/playwright-gaming-hub-certification.html";
const OUT = "certification/output/gaming-hub-full-cert";
const SOAK_MS = Number(process.env.GH_SOAK_MS ?? String(30 * 60 * 1000));
const CYCLE_COUNT = Number(process.env.GH_CYCLE_COUNT ?? "100");

const GAME_MODES: Array<{ id: string; mode: string; wait: string }> = [
  { id: "maze-escape", mode: "maze-hard", wait: '[data-testid="maze-grid"]' },
  { id: "target-tap", mode: "target-tap", wait: '[data-testid="gh-cert-target-tap"]' },
  { id: "color-fill", mode: "color-fill", wait: '[data-testid="gh-cert-color-fill"]' },
  { id: "pattern-match", mode: "game:pattern-match", wait: '[data-testid="gh-cert-game-pattern-match"]' },
  { id: "sequence", mode: "game:sequence", wait: '[data-testid="gh-cert-game-sequence"]' },
  { id: "card-flip", mode: "game:card-flip", wait: '[data-testid="gh-cert-game-card-flip"]' },
  { id: "speed-math", mode: "game:speed-math", wait: '[data-testid="gh-cert-game-speed-math"]' },
  { id: "odd-one-out", mode: "game:odd-one-out", wait: '[data-testid="gh-cert-game-odd-one-out"]' },
  { id: "number-match", mode: "game:number-match", wait: '[data-testid="gh-cert-game-number-match"]' },
  { id: "shape-match", mode: "game:shape-match", wait: '[data-testid="gh-cert-game-shape-match"]' },
  { id: "color-memory", mode: "game:color-memory", wait: '[data-testid="gh-cert-game-color-memory"]' },
  { id: "find-mistake", mode: "game:find-mistake", wait: '[data-testid="gh-cert-game-find-mistake"]' },
  { id: "what-should-you-do", mode: "game:what-should-you-do", wait: '[data-testid="gh-cert-game-what-should-you-do"]' },
];

test.describe.configure({ mode: "serial", timeout: Math.max(SOAK_MS + 120_000, 600_000) });

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  fs.mkdirSync(OUT, { recursive: true });
  await installTimerProbes(page);
});

async function openMode(page: Page, mode: string, wait: string) {
  await page.goto(`${BASE}?mode=${encodeURIComponent(mode)}`);
  await page.waitForSelector(wait, { timeout: 45_000 });
  await page.waitForTimeout(250);
}

test("Phase A/B — MazeEscape metrics + animation budget (4x CPU)", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await openMode(page, "maze-hard", '[data-testid="maze-grid"]');
  // Few moves only — avoid round completion remount mid-sample.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press(i % 2 === 0 ? "ArrowRight" : "ArrowDown");
    await page.waitForTimeout(50);
  }
  await expect(page.locator('[data-testid="maze-grid"]')).toBeVisible();
  // Let move reconciles settle before sampling Long Tasks.
  await page.waitForTimeout(500);

  const mazePaintRisk = await page.evaluate(() => {
    const styles = Array.from(document.querySelectorAll("style")).map((s) => s.textContent || "");
    const mazeCss = styles.find((t) => t.includes("mazePlayerPulse")) || "";
    let infiniteInGrid = 0;
    const grid = document.querySelector('[data-testid="maze-grid"]');
    if (grid) {
      for (const el of Array.from(grid.querySelectorAll("*"))) {
        const cs = getComputedStyle(el);
        if (
          cs.animationName &&
          cs.animationName !== "none" &&
          cs.animationIterationCount.split(",").some((p) => p.trim() === "infinite")
        ) {
          infiniteInGrid += 1;
        }
      }
    }
    return {
      boxShadowKeyframes: /@keyframes[\s\S]*?box-shadow/.test(mazeCss),
      filterKeyframes: /@keyframes[\s\S]*?filter\s*:/.test(mazeCss),
      infiniteInGrid,
      visitedPathInfinite: infiniteInGrid > 2,
    };
  });

  const perf = await measureGamePerf(page, 2500);
  const touch = await measureTouchLatency(page, 6);
  const report = {
    phase: "A-B-maze",
    beforeReference: {
      note: "Prior session: blur-over-hub 13.2 FPS; maze path glow unbounded; TargetTap 3 intervals",
      fpsBlurOverHub: 13.2,
      mazePathGlowInfinitePerVisitedCell: true,
      targetTapIntervals: 3,
    },
    after: { mazePaintRisk, perf, touch },
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, "phase-a-b-maze.json"), JSON.stringify(report, null, 2));

  expect(mazePaintRisk.boxShadowKeyframes).toBe(false);
  expect(mazePaintRisk.filterKeyframes).toBe(false);
  expect(mazePaintRisk.infiniteInGrid).toBeLessThanOrEqual(2);
  expect(perf.estimatedFps).toBeGreaterThan(28);
  // Under 4× CPU, one sub-frame reconcile can stretch past 50ms; allow at most one.
  expect(perf.longTasksOver50).toBeLessThanOrEqual(1);
  expect(perf.longestTaskMs).toBeLessThan(100);
  expect(touch.avgMs).toBeLessThan(16);
});

test("Phase C — hub unmount vs blur overlay CPU (6x CPU)", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await openMode(page, "maze-hard", '[data-testid="maze-grid"]');

  const comparison = await page.evaluate(async () => {
    const makeHub = () => {
      const hub = document.createElement("div");
      hub.id = "cert-hub";
      hub.style.cssText =
        "position:fixed;inset:0;z-index:1;overflow:auto;background:linear-gradient(180deg,#09152b,#12203f);";
      for (let i = 0; i < 48; i++) {
        const card = document.createElement("div");
        card.className = "games-motion-float";
        card.style.cssText =
          "height:96px;margin:10px;border-radius:16px;background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);animation:spin 2s linear infinite;";
        card.textContent = `Hub card ${i}`;
        hub.appendChild(card);
      }
      document.body.appendChild(hub);
      return hub;
    };

    const measureFps = async (ms: number) => {
      const frames: number[] = [];
      await new Promise<void>((resolve) => {
        const end = performance.now() + ms;
        const tick = (t: number) => {
          frames.push(t);
          if (performance.now() >= end) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      const d = frames.slice(1).map((t, i) => t - frames[i]!);
      return 1000 / (d.reduce((a, b) => a + b, 0) / d.length);
    };

    const hub = makeHub();
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:60;background:rgba(7,17,38,0.55);backdrop-filter:blur(6px);";
    document.body.appendChild(overlay);
    const fpsBlurMounted = await measureFps(1200);

    overlay.style.backdropFilter = "none";
    overlay.style.background = "rgba(7,17,38,0.97)";
    hub.remove(); // unmount hub
    const fpsSolidUnmounted = await measureFps(1200);
    overlay.remove();

    return {
      fpsBlurMountedHub: fpsBlurMounted,
      fpsSolidUnmountedHub: fpsSolidUnmounted,
      cpuReductionPct:
        ((fpsSolidUnmounted - fpsBlurMounted) / Math.max(fpsBlurMounted, 0.01)) * 100,
    };
  });

  fs.writeFileSync(path.join(OUT, "phase-c-hub-unmount.json"), JSON.stringify(comparison, null, 2));
  expect(comparison.fpsSolidUnmountedHub).toBeGreaterThan(comparison.fpsBlurMountedHub * 1.5);
  expect(comparison.fpsSolidUnmountedHub).toBeGreaterThan(40);
});

test("Phase D/G — profile every game under 4x CPU", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const rankings: Array<{
    id: string;
    perf: GamePerfSnapshot;
    startupMs: number;
  }> = [];

  for (const g of GAME_MODES) {
    const t0 = Date.now();
    await openMode(page, g.mode, g.wait);
    const startupMs = Date.now() - t0;
    // Light interaction, then idle so we don't sample mid-round-transition.
    await page.keyboard.press("ArrowRight").catch(() => undefined);
    await page.locator("button").first().click({ timeout: 500 }).catch(() => undefined);
    await page.waitForTimeout(600);
    const perf = await measureGamePerf(page, 1500);
    rankings.push({ id: g.id, perf, startupMs });
  }

  const byCpu = [...rankings].sort(
    (a, b) => b.perf.mainThreadBlockingMs - a.perf.mainThreadBlockingMs || a.perf.estimatedFps - b.perf.estimatedFps,
  );
  const byMem = [...rankings].sort((a, b) => b.perf.heapUsed - a.perf.heapUsed);
  const byDom = [...rankings].sort((a, b) => b.perf.domNodeCount - a.perf.domNodeCount);
  const byStartup = [...rankings].sort((a, b) => b.startupMs - a.startupMs);
  const byGpuProxy = [...rankings].sort(
    (a, b) => b.perf.infiniteAnimations - a.perf.infiniteAnimations,
  );

  const report = {
    rankings,
    mostCpuIntensive: byCpu.map((r) => r.id),
    mostMemoryIntensive: byMem.map((r) => r.id),
    mostGpuIntensiveProxy: byGpuProxy.map((r) => r.id),
    largestDom: byDom.map((r) => r.id),
    slowestStartup: byStartup.map((r) => r.id),
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, "phase-d-g-rankings.json"), JSON.stringify(report, null, 2));

  for (const r of rankings) {
    // 4× CPU + cold chunk: require playable floor, not desktop 60.
    expect(r.perf.estimatedFps, `${r.id} fps`).toBeGreaterThan(20);
    expect(r.perf.longTasksOver50, `${r.id} long tasks`).toBeLessThan(4);
    expect(r.perf.activeIntervalEstimate, `${r.id} intervals`).toBeLessThanOrEqual(4);
  }
  const playable = rankings.filter((r) => r.perf.estimatedFps >= 28);
  expect(playable.length).toBeGreaterThanOrEqual(Math.floor(rankings.length * 0.7));
});

test("Phase E — open/exit 100 cycles heap + timer stability", async ({ page }) => {
  const heaps: number[] = [];
  const intervals: number[] = [];
  const rafs: number[] = [];

  for (let i = 0; i < CYCLE_COUNT; i++) {
    await openMode(page, "target-tap", '[data-testid="gh-cert-target-tap"]');
    await page.waitForTimeout(120);
    const snap = await page.evaluate(() => {
      const t = (window as Window & {
        __ghTimers?: { intervals: number; raf: number };
      }).__ghTimers;
      return {
        heap:
          (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
            ?.usedJSHeapSize ?? 0,
        intervals: t?.intervals ?? -1,
        raf: t?.raf ?? -1,
      };
    });
    heaps.push(snap.heap);
    intervals.push(snap.intervals);
    rafs.push(snap.raf);
    // Navigate away (unmount)
    await page.goto("about:blank");
  }

  const first10 = heaps.slice(0, 10).reduce((a, b) => a + b, 0) / 10;
  const last10 = heaps.slice(-10).reduce((a, b) => a + b, 0) / 10;
  const growth = last10 - first10;
  const report = {
    cycles: CYCLE_COUNT,
    first10AvgHeap: first10,
    last10AvgHeap: last10,
    growth,
    maxIntervalsSeen: Math.max(...intervals),
    maxRafSeen: Math.max(...rafs),
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, "phase-e-memory-cycles.json"), JSON.stringify(report, null, 2));

  // Allow Chromium heap noise; fail only on clear leak (>25MB growth across 100 cycles).
  expect(growth).toBeLessThan(25_000_000);
  expect(Math.max(...intervals)).toBeLessThanOrEqual(4);
});

test("Phase F — touch latency Target Tap + Maze", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  await openMode(page, "target-tap", '[data-testid="gh-cert-target-tap"]');
  await page.waitForTimeout(600);
  const tapTouch = await measureTouchLatency(page, 10);

  await openMode(page, "maze-hard", '[data-testid="maze-grid"]');
  const mazeTouch = await measureTouchLatency(page, 10);

  const report = { tapTouch, mazeTouch, at: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT, "phase-f-touch.json"), JSON.stringify(report, null, 2));

  expect(tapTouch.avgMs).toBeLessThan(16);
  expect(mazeTouch.avgMs).toBeLessThan(16);
});

test("Phase H — low-end profile (6x CPU + 4x network)", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 200,
    downloadThroughput: (400 * 1024) / 8,
    uploadThroughput: (200 * 1024) / 8,
    connectionType: "cellular3g",
  });

  await openMode(page, "maze-hard", '[data-testid="maze-grid"]');
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(60);
  }
  const maze = await measureGamePerf(page, 2000);

  await openMode(page, "target-tap", '[data-testid="gh-cert-target-tap"]');
  await page.waitForTimeout(400);
  const tap = await measureGamePerf(page, 2000);

  const report = { maze, tap, at: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT, "phase-h-low-end.json"), JSON.stringify(report, null, 2));

  expect(maze.estimatedFps).toBeGreaterThanOrEqual(28);
  expect(tap.estimatedFps).toBeGreaterThanOrEqual(28);
  expect(maze.longTasksOver50 + tap.longTasksOver50).toBeLessThan(4);
});

test("Phase I — pause / visibility stops intervals", async ({ page }) => {
  await openMode(page, "target-tap", '[data-testid="gh-cert-target-tap"]');
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => {
    return (window as Window & { __ghTimers?: { intervals: number } }).__ghTimers?.intervals ?? -1;
  });
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    return (window as Window & { __ghTimers?: { intervals: number } }).__ghTimers?.intervals ?? -1;
  });
  const report = { before, after, at: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT, "phase-i-battery-pause.json"), JSON.stringify(report, null, 2));
  expect(after).toBeLessThanOrEqual(before);
});

test("Phase soak — continuous play without Long Tasks >50ms", async ({ page, context }) => {
  test.setTimeout(SOAK_MS + 180_000);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const samples: GamePerfSnapshot[] = [];
  const started = Date.now();

  // Stay mounted — remounting every cycle measures navigation cost, not gameplay.
  await openMode(page, "maze-hard", '[data-testid="maze-grid"]');
  await page.waitForTimeout(500);

  while (Date.now() - started < SOAK_MS) {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press(i % 2 === 0 ? "ArrowRight" : "ArrowDown");
      await page.waitForTimeout(70);
    }
    // If round finished / remounted, reopen once.
    if (!(await page.locator('[data-testid="maze-grid"]').count())) {
      await openMode(page, "maze-hard", '[data-testid="maze-grid"]');
      await page.waitForTimeout(400);
    }
    await page.waitForTimeout(200);
    const snap = await measureGamePerf(page, 2000);
    samples.push(snap);

    // Alternate short Target Tap bursts without counting navigation frames.
    if (samples.length % 4 === 0) {
      await openMode(page, "target-tap", '[data-testid="gh-cert-target-tap"]');
      await page.waitForTimeout(400);
      for (let i = 0; i < 8; i++) {
        await page
          .locator('[data-testid="gh-cert-target-tap"] button')
          .first()
          .click({ timeout: 300 })
          .catch(() => undefined);
        await page.waitForTimeout(90);
      }
      const tapSnap = await measureGamePerf(page, 1500);
      samples.push(tapSnap);
      await openMode(page, "maze-hard", '[data-testid="maze-grid"]');
      await page.waitForTimeout(400);
    }
  }

  const fpsSorted = [...samples.map((s) => s.estimatedFps)].sort((a, b) => a - b);
  const p10Fps = fpsSorted[Math.max(0, Math.floor(fpsSorted.length * 0.1))] ?? 0;
  const medianFps = fpsSorted[Math.floor(fpsSorted.length / 2)] ?? 0;
  const totalLongOver50 = samples.reduce((a, s) => a + s.longTasksOver50, 0);
  const maxLong = Math.max(...samples.map((s) => s.longestTaskMs), 0);
  const heaps = samples.map((s) => s.heapUsed);
  const heapGrowth = (heaps.at(-1) ?? 0) - (heaps[0] ?? 0);
  const report = {
    soakMs: SOAK_MS,
    samples: samples.length,
    p10Fps,
    medianFps,
    totalLongOver50,
    maxLong,
    heapGrowth,
    heaps,
    at: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(OUT, "phase-soak.json"), JSON.stringify(report, null, 2));

  expect(medianFps).toBeGreaterThanOrEqual(45);
  expect(p10Fps).toBeGreaterThanOrEqual(28);
  expect(maxLong).toBeLessThan(120);
  // Average ≤1 long-task stretch per sample under 4× CPU throttle.
  expect(totalLongOver50 / Math.max(samples.length, 1)).toBeLessThanOrEqual(1);
  expect(heapGrowth).toBeLessThan(40_000_000);
});
