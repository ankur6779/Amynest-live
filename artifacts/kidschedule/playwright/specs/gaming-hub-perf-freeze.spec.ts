/**
 * Gaming Hub freeze certification — measured FPS, long tasks, heap, input latency.
 * CPU-throttled Chromium approximates mid/low-end Android main-thread budget.
 */
import { test, expect, type Page, type CDPSession } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = "/playwright-gaming-hub-certification.html";
const OUT_DIR = "certification/output/gaming-hub-perf";

test.describe.configure({ mode: "serial", timeout: 180_000 });

async function measureRuntime(page: Page, durationMs: number) {
  return page.evaluate(async (ms) => {
    const frames: number[] = [];
    const longTasks: number[] = [];
    const startHeap =
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize ?? 0;

    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= 50) longTasks.push(entry.duration);
        }
      });
      // Do not use buffered:true — would include page-load / maze-mount tasks outside the sample window.
      observer.observe({ type: "longtask", buffered: false } as PerformanceObserverInit);
    } catch {
      /* longtask unsupported */
    }

    await new Promise<void>((resolve) => {
      const end = performance.now() + ms;
      const tick = (t: number) => {
        frames.push(t);
        if (performance.now() >= end) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    observer?.disconnect();

    const deltas = frames.slice(1).map((t, i) => t - frames[i]!);
    const avgFrameMs =
      deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 16.7;
    const p95FrameMs =
      deltas.length > 0
        ? [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length * 0.95)]!
        : avgFrameMs;
    const dropped = deltas.filter((d) => d > 33).length;
    const endHeap =
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize ?? 0;

    return {
      sampleMs: ms,
      frameCount: frames.length,
      avgFrameMs,
      p95FrameMs,
      estimatedFps: 1000 / avgFrameMs,
      droppedFramesOver33ms: dropped,
      longTaskCount: longTasks.length,
      longestTaskMs: longTasks.length ? Math.max(...longTasks) : 0,
      longTasksOver50: longTasks.filter((d) => d > 50).length,
      heapStart: startHeap,
      heapEnd: endHeap,
      heapDelta: endHeap - startHeap,
    };
  }, durationMs);
}

async function enableCpuThrottle(cdp: CDPSession, rate: number) {
  await cdp.send("Emulation.setCPUThrottlingRate", { rate });
}

async function countMazePaintRisk(page: Page) {
  return page.evaluate(() => {
    const grid = document.querySelector('[data-testid="maze-grid"]');
    if (!grid) return { infiniteInGrid: -1, mazeStyleHasBoxShadowKeyframes: true, mazeStyleHasFilterKeyframes: true };

    let infiniteInGrid = 0;
    for (const el of Array.from(grid.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      if (!cs.animationName || cs.animationName === "none") continue;
      if (cs.animationIterationCount.split(",").some((p) => p.trim() === "infinite")) {
        infiniteInGrid += 1;
      }
    }

    // Maze injects a scoped <style> with MAZE_STYLES — must not animate box-shadow/filter.
    let mazeStyleHasBoxShadowKeyframes = false;
    let mazeStyleHasFilterKeyframes = false;
    for (const styleEl of Array.from(document.querySelectorAll("style"))) {
      const text = styleEl.textContent || "";
      if (!text.includes("mazePlayerPulse") && !text.includes("mazeCellReveal")) continue;
      if (/@keyframes[\s\S]*?box-shadow/.test(text)) mazeStyleHasBoxShadowKeyframes = true;
      if (/@keyframes[\s\S]*?filter\s*:/.test(text)) mazeStyleHasFilterKeyframes = true;
    }

    return { infiniteInGrid, mazeStyleHasBoxShadowKeyframes, mazeStyleHasFilterKeyframes };
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
  fs.mkdirSync(OUT_DIR, { recursive: true });
});

test("Maze Escape hard — FPS / long tasks / no box-shadow keyframes (4x CPU)", async ({
  page,
  context,
}) => {
  const cdp = await context.newCDPSession(page);
  await enableCpuThrottle(cdp, 4);

  await page.goto(`${BASE}?mode=maze-hard`);
  await page.waitForSelector('[data-testid="maze-grid"]', { timeout: 30_000 });

  // Simulate play — walk a few moves to accumulate visited cells.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(80);
    await page.keyboard.press("ArrowDown");
    await page.waitForTimeout(80);
  }

  const anim = await countMazePaintRisk(page);
  const perf = await measureRuntime(page, 3000);

  const report = { scenario: "maze-hard-4xcpu", anim, perf, at: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT_DIR, "maze-hard.json"), JSON.stringify(report, null, 2));

  expect(anim.mazeStyleHasBoxShadowKeyframes, "maze must not animate box-shadow").toBe(false);
  expect(anim.mazeStyleHasFilterKeyframes, "maze must not animate filter").toBe(false);
  // Player pulse + goal pulse only — never N visited-path infinite glows.
  expect(anim.infiniteInGrid).toBeGreaterThanOrEqual(0);
  expect(anim.infiniteInGrid).toBeLessThanOrEqual(2);
  expect(perf.estimatedFps).toBeGreaterThan(28);
  // Under 4× CPU throttle, allow short reconciles; hard fail only on multi-frame freezes.
  expect(perf.longestTaskMs).toBeLessThan(200);
  expect(perf.longTasksOver50).toBeLessThan(12);
});

test("Target Tap — single-loop FPS under 4x CPU throttle", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await enableCpuThrottle(cdp, 4);

  await page.goto(`${BASE}?mode=target-tap`);
  await page.waitForSelector('[data-testid="gh-cert-target-tap"]', { timeout: 30_000 });
  await page.waitForTimeout(400);

  // Tap whatever targets appear for ~2s of play.
  const playUntil = Date.now() + 2000;
  while (Date.now() < playUntil) {
    const btn = page.locator('[data-testid="gh-cert-target-tap"] button').first();
    if (await btn.count()) {
      await btn.click({ timeout: 200 }).catch(() => undefined);
    }
    await page.waitForTimeout(120);
  }

  const perf = await measureRuntime(page, 3000);
  const report = { scenario: "target-tap-4xcpu", perf, at: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT_DIR, "target-tap.json"), JSON.stringify(report, null, 2));

  expect(perf.estimatedFps).toBeGreaterThan(28);
  expect(perf.longestTaskMs).toBeLessThan(100);
  expect(perf.droppedFramesOver33ms).toBeLessThan(perf.frameCount * 0.35);
});

test("Backdrop blur cost — solid overlay vs blur over dense DOM", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await enableCpuThrottle(cdp, 6);

  await page.goto(`${BASE}?mode=maze-hard`);
  await page.waitForSelector('[data-testid="maze-grid"]');

  // Inject a dense hub-like layer + measure with blur vs solid.
  const blurPerf = await page.evaluate(async () => {
    const hub = document.createElement("div");
    hub.id = "perf-fake-hub";
    hub.style.cssText =
      "position:fixed;inset:0;z-index:1;overflow:auto;background:linear-gradient(180deg,#09152b,#12203f);";
    for (let i = 0; i < 40; i++) {
      const card = document.createElement("div");
      card.style.cssText =
        "height:88px;margin:10px;border-radius:16px;background:rgba(255,255,255,0.06);backdrop-filter:blur(12px);";
      card.textContent = `Card ${i}`;
      hub.appendChild(card);
    }
    document.body.appendChild(hub);

    const overlay = document.createElement("div");
    overlay.id = "perf-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:60;background:rgba(7,17,38,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);";
    document.body.appendChild(overlay);

    const frames: number[] = [];
    await new Promise<void>((resolve) => {
      const end = performance.now() + 1500;
      const tick = (t: number) => {
        frames.push(t);
        if (performance.now() >= end) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const deltas = frames.slice(1).map((t, i) => t - frames[i]!);
    const fps = 1000 / (deltas.reduce((a, b) => a + b, 0) / deltas.length);

    overlay.style.backdropFilter = "none";
    (overlay.style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter =
      "none";
    overlay.style.background = "rgba(7,17,38,0.97)";
    hub.style.visibility = "hidden";
    hub.style.contentVisibility = "hidden";

    const frames2: number[] = [];
    await new Promise<void>((resolve) => {
      const end = performance.now() + 1500;
      const tick = (t: number) => {
        frames2.push(t);
        if (performance.now() >= end) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    const deltas2 = frames2.slice(1).map((t, i) => t - frames2[i]!);
    const fpsSolid = 1000 / (deltas2.reduce((a, b) => a + b, 0) / deltas2.length);

    hub.remove();
    overlay.remove();
    return { fpsBlurOverHub: fps, fpsSolidFrozenHub: fpsSolid };
  });

  fs.writeFileSync(
    path.join(OUT_DIR, "backdrop-blur.json"),
    JSON.stringify({ ...blurPerf, at: new Date().toISOString() }, null, 2),
  );

  // Solid + frozen hub must not be worse than blur-over-hub (usually much better).
  expect(blurPerf.fpsSolidFrozenHub).toBeGreaterThanOrEqual(blurPerf.fpsBlurOverHub * 0.9);
});
