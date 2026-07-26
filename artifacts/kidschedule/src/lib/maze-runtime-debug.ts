/**
 * Temporary runtime instrumentation for Maze Escape freeze validation.
 * Enabled via URL ?mazeDebug=1 or localStorage amynest_maze_debug=1.
 */

export type MazeDebugLogEntry = {
  t: number;
  type: string;
  detail?: string;
  ms?: number;
};

export type MazeDebugMetrics = {
  enabled: boolean;
  renderCount: number;
  loadRoundCalls: number;
  finishRoundCalls: number;
  onFinishCalls: number;
  finishTimerScheduleCount: number;
  finishTimerFromUpdaterCount: number;
  loadRoundIds: number[];
  onFinishScores: number[];
  maxActiveTimeouts: number;
  maxActiveIntervals: number;
  maxActiveRaf: number;
  maxHeapBytes: number;
  maxMazeGenMs: number;
  mazeGenCount: number;
  logs: MazeDebugLogEntry[];
};

const MAX_LOGS = 200;

function readTimerProbe(): { timeouts: number; intervals: number; raf: number } {
  if (typeof window === "undefined") return { timeouts: 0, intervals: 0, raf: 0 };
  const t = (window as Window & {
    __ghTimers?: { timeouts: number; intervals: number; raf: number };
  }).__ghTimers;
  return {
    timeouts: t?.timeouts ?? 0,
    intervals: t?.intervals ?? 0,
    raf: t?.raf ?? 0,
  };
}

function readHeapBytes(): number {
  if (typeof performance === "undefined") return 0;
  return (
    (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
      ?.usedJSHeapSize ?? 0
  );
}

export function isMazeRuntimeDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem("amynest_maze_debug") === "1") return true;
  } catch {
    /* ignore */
  }
  return new URLSearchParams(window.location.search).get("mazeDebug") === "1";
}

function createMetrics(): MazeDebugMetrics {
  return {
    enabled: true,
    renderCount: 0,
    loadRoundCalls: 0,
    finishRoundCalls: 0,
    onFinishCalls: 0,
    finishTimerScheduleCount: 0,
    finishTimerFromUpdaterCount: 0,
    loadRoundIds: [],
    onFinishScores: [],
    maxActiveTimeouts: 0,
    maxActiveIntervals: 0,
    maxActiveRaf: 0,
    maxHeapBytes: 0,
    maxMazeGenMs: 0,
    mazeGenCount: 0,
    logs: [],
  };
}

function ensureDebug(): MazeDebugMetrics | null {
  if (!isMazeRuntimeDebugEnabled()) return null;
  const w = window as Window & { __mazeDebug?: MazeDebugMetrics };
  if (!w.__mazeDebug) w.__mazeDebug = createMetrics();
  return w.__mazeDebug;
}

function pushLog(m: MazeDebugMetrics, type: string, detail?: string, ms?: number): void {
  if (m.logs.length >= MAX_LOGS) m.logs.shift();
  m.logs.push({ t: Date.now(), type, detail, ms });
}

function sampleRuntime(m: MazeDebugMetrics): void {
  const timers = readTimerProbe();
  m.maxActiveTimeouts = Math.max(m.maxActiveTimeouts, timers.timeouts);
  m.maxActiveIntervals = Math.max(m.maxActiveIntervals, timers.intervals);
  m.maxActiveRaf = Math.max(m.maxActiveRaf, timers.raf);
  m.maxHeapBytes = Math.max(m.maxHeapBytes, readHeapBytes());
}

export function mazeDebugNoteRender(): void {
  const m = ensureDebug();
  if (!m) return;
  m.renderCount += 1;
  sampleRuntime(m);
}

export function mazeDebugNoteLoadRound(roundIdx: number): void {
  const m = ensureDebug();
  if (!m) return;
  m.loadRoundCalls += 1;
  m.loadRoundIds.push(roundIdx);
  sampleRuntime(m);
  pushLog(m, "loadRound", `idx=${roundIdx}`);
}

export function mazeDebugNoteFinishRound(escaped: boolean, fromUpdater: boolean): void {
  const m = ensureDebug();
  if (!m) return;
  m.finishRoundCalls += 1;
  if (fromUpdater) m.finishTimerFromUpdaterCount += 1;
  sampleRuntime(m);
  pushLog(m, "finishRound", escaped ? "escaped" : "lost", fromUpdater ? 1 : 0);
}

export function mazeDebugNoteFinishTimerScheduled(fromUpdater: boolean): void {
  const m = ensureDebug();
  if (!m) return;
  m.finishTimerScheduleCount += 1;
  if (fromUpdater) m.finishTimerFromUpdaterCount += 1;
  sampleRuntime(m);
  pushLog(m, "finishTimerScheduled", fromUpdater ? "fromUpdater" : "outsideUpdater");
}

export function mazeDebugNoteOnFinish(score: number, total: number): void {
  const m = ensureDebug();
  if (!m) return;
  m.onFinishCalls += 1;
  m.onFinishScores.push(score);
  sampleRuntime(m);
  pushLog(m, "onFinish", `${score}/${total}`);
}

export function mazeDebugNoteMazeGen(durationMs: number): void {
  const m = ensureDebug();
  if (!m) return;
  m.mazeGenCount += 1;
  m.maxMazeGenMs = Math.max(m.maxMazeGenMs, durationMs);
  sampleRuntime(m);
  pushLog(m, "mazeGen", undefined, Math.round(durationMs * 100) / 100);
}

export function mazeDebugGetMetrics(): MazeDebugMetrics | null {
  if (typeof window === "undefined") return null;
  const m = (window as Window & { __mazeDebug?: MazeDebugMetrics }).__mazeDebug;
  if (!m) return null;
  sampleRuntime(m);
  return { ...m, logs: [...m.logs] };
}

export type MazeLayoutProfileEntry = {
  durationMs: number;
  nodeCount: number;
  domReads: number;
  domWrites: number;
};

declare global {
  interface Window {
    __mazeLayoutProfile?: MazeLayoutProfileEntry[];
  }
}

export function mazeLayoutNote(durationMs: number, nodeCount: number, domReads: number, domWrites: number): void {
  if (typeof window === "undefined") return;
  if (!window.__mazeLayoutProfile) window.__mazeLayoutProfile = [];
  window.__mazeLayoutProfile.push({ durationMs, nodeCount, domReads, domWrites });
}

export type MazeLayoutProfileSummary = {
  calls: number;
  totalMs: number;
  avgMs: number;
  maxMs: number;
  totalDomReads: number;
  totalDomWrites: number;
  maxNodesTouched: number;
};

export function mazeLayoutProfileSummary(): MazeLayoutProfileSummary {
  const p = typeof window !== "undefined" ? window.__mazeLayoutProfile ?? [] : [];
  if (p.length === 0) {
    return {
      calls: 0,
      totalMs: 0,
      avgMs: 0,
      maxMs: 0,
      totalDomReads: 0,
      totalDomWrites: 0,
      maxNodesTouched: 0,
    };
  }
  const totalMs = p.reduce((s, e) => s + e.durationMs, 0);
  return {
    calls: p.length,
    totalMs: Math.round(totalMs * 100) / 100,
    avgMs: Math.round((totalMs / p.length) * 100) / 100,
    maxMs: Math.max(...p.map((e) => e.durationMs)),
    totalDomReads: p.reduce((s, e) => s + e.domReads, 0),
    totalDomWrites: p.reduce((s, e) => s + e.domWrites, 0),
    maxNodesTouched: Math.max(...p.map((e) => e.nodeCount)),
  };
}

export function mazeLayoutProfileReset(): void {
  if (typeof window !== "undefined") window.__mazeLayoutProfile = [];
}
