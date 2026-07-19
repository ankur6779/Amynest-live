import type { Page } from "@playwright/test";

export type GamePerfSnapshot = {
  sampleMs: number;
  frameCount: number;
  avgFrameMs: number;
  p95FrameMs: number;
  estimatedFps: number;
  droppedFramesOver33ms: number;
  longTaskCount: number;
  longestTaskMs: number;
  longTasksOver50: number;
  mainThreadBlockingMs: number;
  heapUsed: number;
  domNodeCount: number;
  activeTimeoutEstimate: number;
  activeIntervalEstimate: number;
  activeRafEstimate: number;
  infiniteAnimations: number;
  paintEntries: number;
  inputLatencySamples: number[];
  avgInputLatencyMs: number;
  maxInputLatencyMs: number;
};

/** Install timer/RAF counters before navigating to a game. */
export async function installTimerProbes(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as Window & {
      __ghTimers?: { timeouts: number; intervals: number; raf: number };
    };
    w.__ghTimers = { timeouts: 0, intervals: 0, raf: 0 };
    const origSetTimeout = window.setTimeout.bind(window);
    const origClearTimeout = window.clearTimeout.bind(window);
    const origSetInterval = window.setInterval.bind(window);
    const origClearInterval = window.clearInterval.bind(window);
    const origRaf = window.requestAnimationFrame.bind(window);
    const origCaf = window.cancelAnimationFrame.bind(window);

    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      w.__ghTimers!.timeouts += 1;
      const id = origSetTimeout((...a: unknown[]) => {
        w.__ghTimers!.timeouts = Math.max(0, w.__ghTimers!.timeouts - 1);
        if (typeof handler === "function") (handler as (...x: unknown[]) => void)(...a);
      }, timeout, ...args);
      return id;
    }) as typeof setTimeout;

    window.clearTimeout = ((id?: number) => {
      if (id != null) w.__ghTimers!.timeouts = Math.max(0, w.__ghTimers!.timeouts - 1);
      return origClearTimeout(id as number);
    }) as typeof clearTimeout;

    window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
      w.__ghTimers!.intervals += 1;
      return origSetInterval(handler, timeout, ...args);
    }) as typeof setInterval;

    window.clearInterval = ((id?: number) => {
      if (id != null) w.__ghTimers!.intervals = Math.max(0, w.__ghTimers!.intervals - 1);
      return origClearInterval(id as number);
    }) as typeof clearInterval;

    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      w.__ghTimers!.raf += 1;
      return origRaf((t) => {
        w.__ghTimers!.raf = Math.max(0, w.__ghTimers!.raf - 1);
        cb(t);
      });
    }) as typeof requestAnimationFrame;

    window.cancelAnimationFrame = ((id: number) => {
      w.__ghTimers!.raf = Math.max(0, w.__ghTimers!.raf - 1);
      return origCaf(id);
    }) as typeof cancelAnimationFrame;
  });
}

export async function measureGamePerf(page: Page, durationMs: number): Promise<GamePerfSnapshot> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await measureGamePerfOnce(page, durationMs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes("Execution context was destroyed") || attempt === 2) throw err;
      await page.waitForTimeout(300);
    }
  }
  throw new Error("measureGamePerf failed");
}

async function measureGamePerfOnce(page: Page, durationMs: number): Promise<GamePerfSnapshot> {
  return page.evaluate(async (ms) => {
    const frames: number[] = [];
    const longTasks: number[] = [];
    const inputSamples: number[] = [];
    let paintEntries = 0;

    let longObs: PerformanceObserver | null = null;
    let paintObs: PerformanceObserver | null = null;
    try {
      longObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration >= 16) longTasks.push(entry.duration);
        }
      });
      longObs.observe({ type: "longtask", buffered: false } as PerformanceObserverInit);
    } catch {
      /* optional */
    }
    try {
      paintObs = new PerformanceObserver((list) => {
        paintEntries += list.getEntries().length;
      });
      paintObs.observe({ type: "paint", buffered: true } as PerformanceObserverInit);
    } catch {
      /* optional */
    }

    const onPointer = (e: Event) => {
      const pe = e as PointerEvent;
      if (typeof pe.timeStamp === "number") {
        inputSamples.push(Math.max(0, performance.now() - pe.timeStamp));
      }
    };
    window.addEventListener("pointerdown", onPointer, { passive: true });

    await new Promise<void>((resolve) => {
      const end = performance.now() + ms;
      const tick = (t: number) => {
        frames.push(t);
        if (performance.now() >= end) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    longObs?.disconnect();
    paintObs?.disconnect();
    window.removeEventListener("pointerdown", onPointer);

    const deltas = frames.slice(1).map((t, i) => t - frames[i]!);
    const avgFrameMs =
      deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 16.7;
    const sorted = [...deltas].sort((a, b) => a - b);
    const p95FrameMs = sorted.length
      ? sorted[Math.floor(sorted.length * 0.95)]!
      : avgFrameMs;
    const over50 = longTasks.filter((d) => d > 50);
    const timers = (window as Window & {
      __ghTimers?: { timeouts: number; intervals: number; raf: number };
    }).__ghTimers ?? { timeouts: -1, intervals: -1, raf: -1 };

    let infiniteAnimations = 0;
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const cs = getComputedStyle(el);
      if (!cs.animationName || cs.animationName === "none") continue;
      if (cs.animationIterationCount.split(",").some((p) => p.trim() === "infinite")) {
        infiniteAnimations += 1;
      }
    }

    const heap =
      (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
        ?.usedJSHeapSize ?? 0;

    return {
      sampleMs: ms,
      frameCount: frames.length,
      avgFrameMs,
      p95FrameMs,
      estimatedFps: 1000 / avgFrameMs,
      droppedFramesOver33ms: deltas.filter((d) => d > 33).length,
      longTaskCount: longTasks.length,
      longestTaskMs: longTasks.length ? Math.max(...longTasks) : 0,
      longTasksOver50: over50.length,
      mainThreadBlockingMs: over50.reduce((a, b) => a + b, 0),
      heapUsed: heap,
      domNodeCount: document.getElementsByTagName("*").length,
      activeTimeoutEstimate: timers.timeouts,
      activeIntervalEstimate: timers.intervals,
      activeRafEstimate: timers.raf,
      infiniteAnimations,
      paintEntries,
      inputLatencySamples: inputSamples.slice(0, 40),
      avgInputLatencyMs:
        inputSamples.length > 0
          ? inputSamples.reduce((a, b) => a + b, 0) / inputSamples.length
          : 0,
      maxInputLatencyMs: inputSamples.length ? Math.max(...inputSamples) : 0,
    };
  }, durationMs);
}

export async function measureTouchLatency(page: Page, taps = 8): Promise<{
  samples: number[];
  avgMs: number;
  maxMs: number;
}> {
  const samples: number[] = [];
  const target = page.locator("button").first();
  await target.waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
  for (let i = 0; i < taps; i++) {
    const box = await target.boundingBox().catch(() => null);
    if (!box) break;
    const latency = await page.evaluate(
      async ({ x, y }) => {
        return await new Promise<number>((resolve) => {
          const start = performance.now();
          const onDown = () => {
            window.removeEventListener("pointerdown", onDown, true);
            resolve(performance.now() - start);
          };
          window.addEventListener("pointerdown", onDown, true);
          const el = document.elementFromPoint(x, y) as HTMLElement | null;
          el?.dispatchEvent(
            new PointerEvent("pointerdown", {
              bubbles: true,
              cancelable: true,
              clientX: x,
              clientY: y,
              pointerType: "touch",
            }),
          );
          // Fallback if no handler
          window.setTimeout(() => {
            window.removeEventListener("pointerdown", onDown, true);
            resolve(performance.now() - start);
          }, 50);
        });
      },
      { x: box.x + box.width / 2, y: box.y + box.height / 2 },
    );
    samples.push(latency);
    await page.waitForTimeout(80);
  }
  return {
    samples,
    avgMs: samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : 0,
    maxMs: samples.length ? Math.max(...samples) : 0,
  };
}
