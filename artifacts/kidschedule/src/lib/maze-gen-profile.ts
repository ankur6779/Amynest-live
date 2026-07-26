import type { GameDifficulty } from "@/lib/game-difficulty";

export type MazeGenProfileEntry = {
  start: number;
  end: number;
  durationMs: number;
  attempts: number;
  failures: number;
  pathValidations: number;
  size: number;
  difficulty: GameDifficulty;
  roundIdx?: number;
  yielded?: boolean;
};

type ProfileStore = {
  enabled: boolean;
  yieldBetweenAttempts: boolean;
  entries: MazeGenProfileEntry[];
};

function store(): ProfileStore {
  const g = globalThis as typeof globalThis & { __mazeGenProfileStore?: ProfileStore };
  if (!g.__mazeGenProfileStore) {
    g.__mazeGenProfileStore = { enabled: false, yieldBetweenAttempts: false, entries: [] };
  }
  return g.__mazeGenProfileStore;
}

export function enableMazeGenProfiling(opts?: { yieldBetweenAttempts?: boolean }): void {
  const s = store();
  s.enabled = true;
  s.yieldBetweenAttempts = opts?.yieldBetweenAttempts ?? false;
  s.entries = [];
}

export function disableMazeGenProfiling(): MazeGenProfileEntry[] {
  const s = store();
  s.enabled = false;
  s.yieldBetweenAttempts = false;
  return [...s.entries];
}

export function isMazeGenProfilingEnabled(): boolean {
  return store().enabled;
}

export function shouldYieldBetweenMazeAttempts(): boolean {
  return store().yieldBetweenAttempts;
}

export function recordMazeGenProfile(entry: MazeGenProfileEntry): void {
  if (!store().enabled) return;
  store().entries.push(entry);
}

export function mazeGenProfileStats(entries: MazeGenProfileEntry[]) {
  if (entries.length === 0) {
    return { count: 0, avgMs: 0, maxMs: 0, maxAttempts: 0, p95Ms: 0, over50ms: 0, over100ms: 0, over250ms: 0, over1000ms: 0 };
  }
  const durations = entries.map((e) => e.durationMs).sort((a, b) => a - b);
  const attempts = entries.map((e) => e.attempts);
  return {
    count: entries.length,
    avgMs: durations.reduce((a, b) => a + b, 0) / durations.length,
    maxMs: Math.max(...durations),
    maxAttempts: Math.max(...attempts),
    p95Ms: durations[Math.floor(durations.length * 0.95)] ?? durations.at(-1)!,
    over50ms: durations.filter((d) => d > 50).length,
    over100ms: durations.filter((d) => d > 100).length,
    over250ms: durations.filter((d) => d > 250).length,
    over1000ms: durations.filter((d) => d > 1000).length,
  };
}
