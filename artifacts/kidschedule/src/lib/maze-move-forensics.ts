/**
 * Movement pipeline forensics — enabled via ?mazeMoveTrace=1 or localStorage amynest_maze_move_trace=1
 */

export type MoveSource = "keyboard" | "dpad" | "touch" | "unknown";

export type MoveForensics = {
  enabled: boolean;
  moveCalls: number;
  moveBlocked: number;
  moveApplied: number;
  moveIgnoredDone: number;
  keyboardCalls: number;
  dpadCalls: number;
  touchCalls: number;
  finishEffectRuns: number;
  pendingFinishSets: number;
  goalDetections: number;
  maxMovesPerSecond: number;
  maxRendersPerSecond: number;
  maxActiveRaf: number;
  lastPositions: string[];
  oscillationEvents: number;
  duplicatePositionEvents: number;
  lastMoveAt: number;
  lastMoveSource: MoveSource;
  lastBlockedAt: number;
  roundMoveTotals: number[];
  currentRoundMoves: number;
  logs: Array<{ t: number; type: string; detail?: string }>;
};

const MAX_LOGS = 300;
const MAX_POSITIONS = 80;

function store(): MoveForensics {
  const g = globalThis as typeof globalThis & { __mazeMoveForensics?: MoveForensics };
  if (!g.__mazeMoveForensics) {
    g.__mazeMoveForensics = {
      enabled: true,
      moveCalls: 0,
      moveBlocked: 0,
      moveApplied: 0,
      moveIgnoredDone: 0,
      keyboardCalls: 0,
      dpadCalls: 0,
      touchCalls: 0,
      finishEffectRuns: 0,
      pendingFinishSets: 0,
      goalDetections: 0,
      maxMovesPerSecond: 0,
      maxRendersPerSecond: 0,
      maxActiveRaf: 0,
      lastPositions: [],
      oscillationEvents: 0,
      duplicatePositionEvents: 0,
      lastMoveAt: 0,
      lastMoveSource: "unknown",
      lastBlockedAt: 0,
      roundMoveTotals: [],
      currentRoundMoves: 0,
      logs: [],
    };
  }
  return g.__mazeMoveForensics;
}

export function isMazeMoveTraceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage?.getItem("amynest_maze_move_trace") === "1") return true;
  } catch {
    /* ignore */
  }
  return new URLSearchParams(window.location.search).get("mazeMoveTrace") === "1";
}

function log(type: string, detail?: string): void {
  const s = store();
  if (s.logs.length >= MAX_LOGS) s.logs.shift();
  s.logs.push({ t: Date.now(), type, detail });
}

function sampleRaf(): void {
  const t = (window as Window & { __ghTimers?: { raf: number } }).__ghTimers;
  if (t) store().maxActiveRaf = Math.max(store().maxActiveRaf, t.raf);
}

function notePosition(pos: string): void {
  const s = store();
  const prev = s.lastPositions.at(-1);
  const prev2 = s.lastPositions.at(-2);
  if (prev === pos) s.duplicatePositionEvents += 1;
  if (prev2 === pos && prev !== pos) s.oscillationEvents += 1;
  s.lastPositions.push(pos);
  if (s.lastPositions.length > MAX_POSITIONS) s.lastPositions.shift();
}

function noteMoveRate(): void {
  const s = store();
  const now = Date.now();
  if (s.lastMoveAt > 0) {
    const dt = now - s.lastMoveAt;
    if (dt > 0 && dt < 1000) {
      const rate = 1000 / dt;
      s.maxMovesPerSecond = Math.max(s.maxMovesPerSecond, rate);
    }
  }
  s.lastMoveAt = now;
  sampleRaf();
}

export function mazeMoveTraceInput(source: MoveSource): void {
  if (!isMazeMoveTraceEnabled()) return;
  const s = store();
  if (source === "keyboard") s.keyboardCalls += 1;
  else if (source === "dpad") s.dpadCalls += 1;
  else if (source === "touch") s.touchCalls += 1;
  log("input", source);
}

export function mazeMoveTraceEnter(source: MoveSource, done: boolean): void {
  if (!isMazeMoveTraceEnabled()) return;
  const s = store();
  s.moveCalls += 1;
  s.lastMoveSource = source;
  if (done) {
    s.moveIgnoredDone += 1;
    log("moveIgnoredDone", source);
    return;
  }
  noteMoveRate();
  log("moveEnter", source);
}

export function mazeMoveTraceBlocked(source: MoveSource, pos: string): void {
  if (!isMazeMoveTraceEnabled()) return;
  const s = store();
  s.moveBlocked += 1;
  s.lastBlockedAt = Date.now();
  notePosition(pos);
  log("moveBlocked", `${source}@${pos}`);
}

export function mazeMoveTraceApplied(source: MoveSource, pos: string, moves: number): void {
  if (!isMazeMoveTraceEnabled()) return;
  const s = store();
  s.moveApplied += 1;
  s.currentRoundMoves += 1;
  notePosition(pos);
  log("moveApplied", `${source}@${pos} m=${moves}`);
}

export function mazeMoveTraceGoal(source: MoveSource): void {
  if (!isMazeMoveTraceEnabled()) return;
  store().goalDetections += 1;
  log("goal", source);
}

export function mazeMoveTracePendingFinish(): void {
  if (!isMazeMoveTraceEnabled()) return;
  store().pendingFinishSets += 1;
  log("pendingFinish");
}

export function mazeMoveTraceFinishEffect(): void {
  if (!isMazeMoveTraceEnabled()) return;
  const s = store();
  s.finishEffectRuns += 1;
  s.roundMoveTotals.push(s.currentRoundMoves);
  s.currentRoundMoves = 0;
  log("finishEffect");
}

export function mazeMoveTraceRender(): void {
  if (!isMazeMoveTraceEnabled()) return;
  const s = store();
  const now = Date.now();
  const recent = s.logs.filter((l) => l.type === "render" && now - l.t < 1000).length + 1;
  s.maxRendersPerSecond = Math.max(s.maxRendersPerSecond, recent);
  if (recent <= 3) log("render");
  sampleRaf();
}

export function mazeMoveTraceSnapshot(): MoveForensics {
  const s = store();
  sampleRaf();
  return { ...s, lastPositions: [...s.lastPositions], logs: [...s.logs], roundMoveTotals: [...s.roundMoveTotals] };
}

export function mazeMoveTraceReset(): void {
  if (typeof window === "undefined") return;
  (globalThis as typeof globalThis & { __mazeMoveForensics?: MoveForensics }).__mazeMoveForensics = undefined;
}
