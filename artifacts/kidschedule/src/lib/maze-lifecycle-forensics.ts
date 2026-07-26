/**
 * Lifecycle checkpoint + round telemetry for freeze forensics.
 * Enabled via ?mazeDebug=1 or localStorage amynest_maze_debug=1.
 */

export type LifecycleCheckpoint = {
  name: string;
  t: number;
  durationMs: number;
  completed: boolean;
  round: number;
  detail?: string;
};

export type RoundTelemetry = {
  round: number;
  t: number;
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
};

export type MazeLifecycleState = {
  enabled: boolean;
  currentRound: number;
  lastCheckpoint: LifecycleCheckpoint | null;
  checkpoints: LifecycleCheckpoint[];
  roundSnapshots: RoundTelemetry[];
  pendingStarts: Map<string, number>;
};

const MAX_CHECKPOINTS = 500;

function enabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem("amynest_maze_debug") === "1") return true;
  } catch {
    /* ignore */
  }
  return new URLSearchParams(window.location.search).get("mazeDebug") === "1";
}

function state(): MazeLifecycleState {
  const w = window as Window & { __mazeLifecycle?: MazeLifecycleState };
  if (!w.__mazeLifecycle) {
    w.__mazeLifecycle = {
      enabled: true,
      currentRound: 0,
      lastCheckpoint: null,
      checkpoints: [],
      roundSnapshots: [],
      pendingStarts: new Map(),
    };
  }
  return w.__mazeLifecycle;
}

function readTimers(): { timeouts: number; intervals: number; raf: number } {
  const t = (window as Window & {
    __ghTimers?: { timeouts: number; intervals: number; raf: number };
  }).__ghTimers;
  return { timeouts: t?.timeouts ?? 0, intervals: t?.intervals ?? 0, raf: t?.raf ?? 0 };
}

function readRenderCount(): number {
  return (window as Window & { __mazeDebug?: { renderCount: number } }).__mazeDebug?.renderCount ?? 0;
}

function readLayoutStats(): { totalMs: number; calls: number } {
  const p = window.__mazeLayoutProfile ?? [];
  return {
    totalMs: p.reduce((s, e) => s + e.durationMs, 0),
    calls: p.length,
  };
}

function pushCheckpoint(
  name: string,
  durationMs: number,
  completed: boolean,
  detail?: string,
): void {
  if (!enabled()) return;
  const s = state();
  const cp: LifecycleCheckpoint = {
    name,
    t: Date.now(),
    durationMs,
    completed,
    round: s.currentRound,
    detail,
  };
  if (s.checkpoints.length >= MAX_CHECKPOINTS) s.checkpoints.shift();
  s.checkpoints.push(cp);
  s.lastCheckpoint = cp;
}

export function mazeLifecycleSetRound(round: number): void {
  if (!enabled()) return;
  state().currentRound = round;
}

export function mazeLifecycleStart(name: string): void {
  if (!enabled()) return;
  state().pendingStarts.set(name, performance.now());
}

export function mazeLifecycleEnd(name: string, completed = true, detail?: string): void {
  if (!enabled()) return;
  const s = state();
  const start = s.pendingStarts.get(name);
  const durationMs = start != null ? performance.now() - start : 0;
  s.pendingStarts.delete(name);
  pushCheckpoint(name, Math.round(durationMs * 100) / 100, completed, detail);
}

/** Lightweight move checkpoint — last move overwrites pending move timing. */
export function mazeLifecycleMoveCheckpoint(detail?: string): void {
  if (!enabled()) return;
  pushCheckpoint("move", 0, true, detail);
}

export function mazeLifecycleGoalReached(movesUsed: number): void {
  if (!enabled()) return;
  pushCheckpoint("goalReached", 0, true, `moves=${movesUsed}`);
}

export function mazeLifecycleReward(): void {
  if (!enabled()) return;
  pushCheckpoint("reward", 0, true);
}

export function mazeLifecycleCelebration(): void {
  if (!enabled()) return;
  pushCheckpoint("celebration", 0, true);
}

export function mazeLifecycleNewMazeReady(size: number): void {
  if (!enabled()) return;
  pushCheckpoint("newMazeReady", 0, true, `size=${size}`);
}

export function mazeLifecycleRenderComplete(durationMs: number, nodeCount: number): void {
  if (!enabled()) return;
  pushCheckpoint("renderComplete", durationMs, true, `nodes=${nodeCount}`);
}

export function mazeLifecycleDialog(none = true): void {
  if (!enabled()) return;
  pushCheckpoint("dialog", 0, none, none ? "none" : "open");
}

export function mazeLifecycleCaptureRoundSnapshot(round: number): void {
  if (!enabled()) return;
  const s = state();
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  const timers = readTimers();
  const layout = readLayoutStats();

  let infiniteAnimations = 0;
  for (const el of Array.from(document.querySelectorAll("*"))) {
    const cs = getComputedStyle(el);
    if (!cs.animationName || cs.animationName === "none") continue;
    if (cs.animationIterationCount.split(",").some((p) => p.trim() === "infinite")) {
      infiniteAnimations += 1;
    }
  }

  const snap: RoundTelemetry = {
    round,
    t: Date.now(),
    heapMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    domNodes: document.querySelectorAll("*").length,
    renderCount: readRenderCount(),
    activeTimeouts: timers.timeouts,
    activeIntervals: timers.intervals,
    activeRaf: timers.raf,
    infiniteAnimations,
    lastLifecycleStage: s.lastCheckpoint?.name ?? "unknown",
    layoutEffectTotalMs: Math.round(layout.totalMs * 100) / 100,
    layoutEffectCalls: layout.calls,
  };

  const idx = s.roundSnapshots.findIndex((r) => r.round === round);
  if (idx >= 0) s.roundSnapshots[idx] = snap;
  else s.roundSnapshots.push(snap);
}

export function mazeLifecycleExport(): {
  lastCheckpoint: LifecycleCheckpoint | null;
  checkpoints: LifecycleCheckpoint[];
  roundSnapshots: RoundTelemetry[];
  currentRound: number;
} {
  const s = state();
  return {
    lastCheckpoint: s.lastCheckpoint,
    checkpoints: [...s.checkpoints],
    roundSnapshots: [...s.roundSnapshots],
    currentRound: s.currentRound,
  };
}
