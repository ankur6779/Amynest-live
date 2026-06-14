import type { GameDifficulty } from "@/lib/game-difficulty";

const STORAGE_KEY = "amynest_maze_analytics_v1";
const MAX_ENTRIES = 40;

export interface MazeRoundStats {
  completionTimeMs: number;
  wrongTurns: number;
  backtracks: number;
  difficulty: GameDifficulty;
  size: number;
  won: boolean;
  movesUsed: number;
  pathLength: number;
  recordedAt: number;
}

export interface MazeAnalyticsSummary {
  sessions: MazeRoundStats[];
  avgWrongTurns: number;
  avgBacktracks: number;
  winRate: number;
}

function readSessions(): MazeRoundStats[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MazeRoundStats[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSessions(sessions: MazeRoundStats[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(-MAX_ENTRIES)));
  } catch {
    /* ignore quota */
  }
}

export function recordMazeRoundStats(stats: Omit<MazeRoundStats, "recordedAt">): void {
  const sessions = readSessions();
  sessions.push({ ...stats, recordedAt: Date.now() });
  writeSessions(sessions);
}

export function getMazeAnalyticsSummary(): MazeAnalyticsSummary {
  const sessions = readSessions();
  if (sessions.length === 0) {
    return { sessions: [], avgWrongTurns: 0, avgBacktracks: 0, winRate: 0 };
  }
  const wins = sessions.filter((s) => s.won).length;
  const avgWrongTurns = sessions.reduce((sum, s) => sum + s.wrongTurns, 0) / sessions.length;
  const avgBacktracks = sessions.reduce((sum, s) => sum + s.backtracks, 0) / sessions.length;
  return {
    sessions,
    avgWrongTurns,
    avgBacktracks,
    winRate: wins / sessions.length,
  };
}

/** Suggest maze size within difficulty band using recent performance. */
export function adaptiveMazeSize(
  roundIndex: number,
  difficulty: GameDifficulty,
  totalRounds: number,
): number {
  const summary = getMazeAnalyticsSummary();
  const recent = summary.sessions.filter((s) => s.difficulty === difficulty).slice(-6);
  const baseMin =
    difficulty === "easy" ? 5 : difficulty === "hard" ? 9 : 7;
  const baseMax =
    difficulty === "easy" ? 6 : difficulty === "hard" ? 12 : 8;
  const progress = totalRounds <= 1 ? 0 : roundIndex / (totalRounds - 1);
  let size = Math.round(baseMin + (baseMax - baseMin) * progress);

  if (recent.length >= 3) {
    const fastWins = recent.filter(
      (s) => s.won && s.completionTimeMs < s.pathLength * 900 && s.wrongTurns <= 1,
    ).length;
    const struggles = recent.filter((s) => !s.won || s.wrongTurns >= 4).length;
    if (fastWins >= 2 && size < baseMax) size += 1;
    if (struggles >= 2 && size > baseMin) size -= 1;
  }

  return Math.min(baseMax, Math.max(baseMin, size));
}
