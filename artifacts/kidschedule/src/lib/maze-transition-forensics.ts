/**
 * Passive inter-round transition forensics — debug only via ?transitionTrace=1
 * or localStorage amynest_transition_trace=1. Does NOT wrap Promise.then / queueMicrotask.
 */

export type TransitionThread = "main" | "microtask" | "macrotask";

export type TransitionPhase =
  | "ENTER"
  | "EXIT"
  | "SCHEDULED"
  | "FIRED"
  | "COMPLETED"
  | "START"
  | "END"
  | "MARK";

export type TransitionEvent = {
  name: string;
  phase: TransitionPhase;
  detail?: string;
  ts: number;
  perfMs: number;
  thread: TransitionThread;
  durationMs?: number;
  pendingTimeouts: number;
  pendingIntervals: number;
  pendingRaf: number;
  heapMb: number | null;
  domNodes: number;
  stack?: string;
};

type TransitionState = {
  events: TransitionEvent[];
  enterStack: Map<string, number>;
  audit: Record<string, number>;
};

declare global {
  interface Window {
    __mazeTransitionExport?: () => {
      events: TransitionEvent[];
      lastCompleted: TransitionEvent | null;
      lastEvent: TransitionEvent | null;
      audit: Record<string, number>;
    };
    __ghTimers?: { timeouts: number; intervals: number; raf: number };
  }
}

const MAX_EVENTS = 400;

function readPending(): { timeouts: number; intervals: number; raf: number } {
  const t = typeof window !== "undefined" ? window.__ghTimers : undefined;
  return { timeouts: t?.timeouts ?? -1, intervals: t?.intervals ?? -1, raf: t?.raf ?? -1 };
}

function snapshot(): Omit<TransitionEvent, "name" | "phase" | "durationMs" | "detail" | "stack" | "thread"> {
  const pending = readPending();
  const mem = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
  return {
    ts: Date.now(),
    perfMs: performance.now(),
    pendingTimeouts: pending.timeouts,
    pendingIntervals: pending.intervals,
    pendingRaf: pending.raf,
    heapMb: mem ? Math.round(mem.usedJSHeapSize / 1048576) : null,
    domNodes: typeof document !== "undefined" ? document.querySelectorAll("*").length : 0,
  };
}

function state(): TransitionState {
  const w = window as Window & { __mazeTransitionState?: TransitionState };
  if (!w.__mazeTransitionState) {
    w.__mazeTransitionState = { events: [], enterStack: new Map(), audit: {} };
  }
  return w.__mazeTransitionState;
}

export function isTransitionTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("amynest_transition_trace") === "1") return true;
    return new URLSearchParams(window.location.search).get("transitionTrace") === "1";
  } catch {
    return false;
  }
}

function persistEvents(s: TransitionState): void {
  try {
    localStorage.setItem(
      "__mazeTransitionEvents",
      JSON.stringify({ events: s.events.slice(-120), audit: s.audit }),
    );
  } catch {
    /* ignore */
  }
}

function push(
  name: string,
  phase: TransitionPhase,
  detail?: string,
  thread: TransitionThread = "main",
): void {
  if (!isTransitionTraceEnabled()) return;
  if (typeof window !== "undefined") window.__mazeTransitionExport = transitionExport;
  const s = state();
  const base = snapshot();
  let durationMs: number | undefined;
  const enterKey = `${name}:ENTER`;
  if (phase === "ENTER" || phase === "START") {
    s.enterStack.set(enterKey, base.perfMs);
  } else if (phase === "EXIT" || phase === "END" || phase === "COMPLETED") {
    const t0 = s.enterStack.get(enterKey);
    if (t0 != null) durationMs = Math.round((base.perfMs - t0) * 1000) / 1000;
  }
  let stack: string | undefined;
  try {
    stack = new Error("transition-trace").stack;
  } catch {
    /* ignore */
  }
  const ev: TransitionEvent = { name, phase, detail, ...base, thread, durationMs, stack };
  if (s.events.length >= MAX_EVENTS) s.events.shift();
  s.events.push(ev);
  persistEvents(s);
}

export function transitionTraceEnter(name: string, detail?: string): void {
  push(name, "ENTER", detail);
}

export function transitionTraceExit(name: string, detail?: string): void {
  push(name, "EXIT", detail);
}

export function transitionTraceMark(name: string, detail?: string): void {
  push(name, "MARK", detail);
}

export function transitionTraceScheduled(name: string, detail?: string): void {
  push(name, "SCHEDULED", detail, "macrotask");
  state().audit.setTimeoutScheduled = (state().audit.setTimeoutScheduled ?? 0) + 1;
}

export function transitionTraceFired(name: string, detail?: string): void {
  push(name, "FIRED", detail, "macrotask");
  state().audit.setTimeoutFired = (state().audit.setTimeoutFired ?? 0) + 1;
}

export function transitionTraceCompleted(name: string, detail?: string): void {
  push(name, "COMPLETED", detail, "macrotask");
}

export function transitionTracePaint(detail?: string): void {
  push("browserPaint", "MARK", detail, "macrotask");
  state().audit.rafPaint = (state().audit.rafPaint ?? 0) + 1;
}

/** Passive audit — timer/heap sampling via __ghTimers only. */
export function transitionInstallAsyncAudit(): void {
  if (!isTransitionTraceEnabled() || typeof window === "undefined") return;
  const w = window as Window & { __transitionAuditInstalled?: boolean };
  if (w.__transitionAuditInstalled) return;
  w.__transitionAuditInstalled = true;
  window.__mazeTransitionExport = transitionExport;
  const s = state();
  s.audit.auditInstalled = 1;

  const sample = (): void => {
    const pending = readPending();
    s.audit.samples = (s.audit.samples ?? 0) + 1;
    s.audit.maxPendingTimeouts = Math.max(s.audit.maxPendingTimeouts ?? 0, pending.timeouts);
    s.audit.maxPendingIntervals = Math.max(s.audit.maxPendingIntervals ?? 0, pending.intervals);
    s.audit.maxPendingRaf = Math.max(s.audit.maxPendingRaf ?? 0, pending.raf);
  };
  sample();
  window.setInterval(sample, 250);

  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === "longtask") {
          s.audit.longTasks = (s.audit.longTasks ?? 0) + 1;
          s.audit.maxLongTaskMs = Math.max(s.audit.maxLongTaskMs ?? 0, entry.duration);
        }
      }
    });
    po.observe({ type: "longtask", buffered: true } as PerformanceObserverInit);
  } catch {
    /* optional */
  }
}

function lastCompletedEvent(events: TransitionEvent[]): TransitionEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i]!;
    if (e.phase === "EXIT" || e.phase === "COMPLETED" || e.phase === "END") return e;
    if (e.phase === "MARK" && (e.name === "goalReached" || e.name === "interactionEnabled" || e.name === "browserPaint")) {
      return e;
    }
  }
  return null;
}

export function transitionExport(): {
  events: TransitionEvent[];
  lastCompleted: TransitionEvent | null;
  lastEvent: TransitionEvent | null;
  audit: Record<string, number>;
} {
  const s = state();
  const events = [...s.events];
  return {
    events,
    lastCompleted: lastCompletedEvent(events),
    lastEvent: events.at(-1) ?? null,
    audit: { ...s.audit },
  };
}

if (typeof window !== "undefined") {
  window.__mazeTransitionExport = transitionExport;
}
