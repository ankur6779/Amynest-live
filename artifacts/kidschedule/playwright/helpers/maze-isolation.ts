import type { Page } from "@playwright/test";

/** Subsystems isolatable without MazeEscape production edits. */
export type MazeIsolateProfile =
  | "baseline"
  | "confetti"
  | "audio"
  | "haptics"
  | "analytics"
  | "animations"
  | "decorative"
  | "strictMode"
  | "gameShellIdle";

export const PRIORITY_ISOLATES: MazeIsolateProfile[] = [
  "baseline",
  "confetti",
  "decorative",
  "audio",
  "analytics",
  "strictMode",
  "animations",
  "haptics",
  "gameShellIdle",
];

export type HeapSnapshot = {
  round: number;
  heapMb: number | null;
  domNodes: number;
  infiniteAnimations: number;
  activeTimeouts: number;
  activeIntervals: number;
  activeRaf: number;
};

export type SoakResult = {
  profile: MazeIsolateProfile;
  disabled: boolean;
  completed: boolean;
  roundsCompleted: number;
  hangRound: number | null;
  error: string | null;
  durationMs: number;
  heapSnapshots: HeapSnapshot[];
  perfRounds5to8: {
    longTasksOver50: number;
    longestTaskMs: number;
    longTasksOver100: number;
  } | null;
  finishedVisible: boolean;
};

/** Apply cert-fixture / browser stubs for one isolation profile (disabled = subsystem off). */
export async function applyMazeIsolation(
  page: Page,
  profile: MazeIsolateProfile,
  disabled: boolean,
): Promise<void> {
  if (!disabled || profile === "baseline") return;

  await page.addInitScript(({ profile: p }) => {
    const w = window as Window & {
      __mazeIsolation?: string;
      __mazeIsolationDisabled?: boolean;
    };
    w.__mazeIsolation = p;
    w.__mazeIsolationDisabled = true;

    if (p === "confetti" || p === "decorative") {
      try {
        Object.defineProperty(navigator, "deviceMemory", {
          configurable: true,
          get: () => 2,
        });
      } catch {
        /* ignore */
      }
    }

    if (p === "decorative" || p === "animations") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.matches = true;
      mq.media = "(prefers-reduced-motion: reduce)";
      mq.addEventListener = () => undefined;
      mq.removeEventListener = () => undefined;
      try {
        localStorage.setItem("amynest:reduced-motion", "on");
      } catch {
        /* ignore */
      }
    }

    if (p === "audio") {
      const OrigCtx = window.AudioContext;
      if (OrigCtx) {
        window.AudioContext = class extends OrigCtx {
          constructor(...args: ConstructorParameters<typeof OrigCtx>) {
            super(...args);
            this.suspend();
          }
        } as typeof AudioContext;
      }
      const origOsc = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function noopStart() {
        /* muted */
      };
      void origOsc;
    }

    if (p === "haptics") {
      Object.defineProperty(navigator, "vibrate", {
        configurable: true,
        value: () => false,
      });
    }

    if (p === "analytics") {
      const origSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === "amynest_maze_analytics_v1") return;
        return origSet.call(this, key, value);
      };
    }

    if (p === "gameShellIdle") {
      const origInterval = window.setInterval.bind(window);
      window.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
        if (timeout === 2000) return 0 as ReturnType<typeof setInterval>;
        return origInterval(handler, timeout, ...args);
      }) as typeof setInterval;
    }
  }, { profile });
}

export function buildMazeUrl(profile: MazeIsolateProfile, disabled: boolean): string {
  const params = new URLSearchParams({ mode: "maze-easy", mazeDebug: "1" });
  if (profile === "strictMode" && disabled) params.set("noStrictMode", "1");
  if (disabled && profile !== "baseline" && profile !== "strictMode") {
    params.set("mazeIsolate", profile);
  }
  return `/playwright-gaming-hub-certification.html?${params.toString()}`;
}

export async function captureHeapSnapshot(page: Page, round: number): Promise<HeapSnapshot> {
  return page.evaluate((r) => {
    const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
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

    return {
      round: r,
      heapMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
      domNodes: document.querySelectorAll("*").length,
      infiniteAnimations,
      activeTimeouts: timers.timeouts,
      activeIntervals: timers.intervals,
      activeRaf: timers.raf,
    };
  }, round);
}

export async function installLongTaskProbe(page: Page): Promise<void> {
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

export async function readLongTaskSummary(page: Page): Promise<{
  longTasksOver50: number;
  longestTaskMs: number;
  longTasksOver100: number;
  lastEntry: { duration: number; start: number; name?: string } | null;
}> {
  return page.evaluate(() => {
    const lt =
      (window as Window & { __mazeLongTasks?: Array<{ duration: number; start: number; name?: string }> })
        .__mazeLongTasks ?? [];
    const sorted = [...lt].sort((a, b) => b.start - a.start);
    return {
      longTasksOver50: lt.filter((t) => t.duration > 50).length,
      longestTaskMs: lt.length ? Math.max(...lt.map((t) => t.duration)) : 0,
      longTasksOver100: lt.filter((t) => t.duration > 100).length,
      lastEntry: sorted[0] ?? null,
    };
  });
}
