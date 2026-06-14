import type { GameDifficulty } from "@/lib/game-difficulty";

/** Standard session length — all round-based mini games ramp across these rounds. */
export const GAME_SESSION_ROUNDS = 8;

/** 0 on first round → 1 on last round (smooth gradual ramp). */
export function sessionProgress(roundIndex: number, totalRounds = GAME_SESSION_ROUNDS): number {
  if (totalRounds <= 1) return 0;
  return Math.min(1, Math.max(0, roundIndex / (totalRounds - 1)));
}

/** Integer value that grows from min → max across the session. */
export function sessionScale(
  roundIndex: number,
  min: number,
  max: number,
  total = GAME_SESSION_ROUNDS,
): number {
  const t = sessionProgress(roundIndex, total);
  return Math.round(min + (max - min) * t);
}

/** Memory / sequence lengths per round, e.g. [3, 4, 4, 5, 5, 6, 7, 8]. */
export function sessionSequenceLengths(
  total = GAME_SESSION_ROUNDS,
  startLen = 3,
  endLen = 8,
): number[] {
  return Array.from({ length: total }, (_, i) => sessionScale(i, startLen, endLen, total));
}

export function sessionChoiceCount(
  roundIndex: number,
  min = 4,
  max = 6,
  total = GAME_SESSION_ROUNDS,
): number {
  return sessionScale(roundIndex, min, max, total);
}

/** 3×3 early rounds, 4×4 later rounds. */
export function sessionGridSide(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  return roundIndex < Math.floor(total * 0.45) ? 3 : 4;
}

export function sessionDotCount(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  return sessionScale(roundIndex, 2, 12, total);
}

export function sessionShapeCount(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  return sessionScale(roundIndex, 3, 6, total);
}

export function sessionOddOneOutItems(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  return sessionScale(roundIndex, 4, 6, total);
}

export function sessionHiddenTargetCount(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  return sessionScale(roundIndex, 3, 5, total);
}

export function sessionPatternLength(roundIndex: number, total = GAME_SESSION_ROUNDS): number {
  return sessionScale(roundIndex, 6, 12, total);
}

export interface SessionMathRoundConfig {
  perQSeconds: number;
  maxNum: number;
  allowMultiply: boolean;
  allowDivide: boolean;
}

export function sessionMathConfig(roundIndex: number, total = GAME_SESSION_ROUNDS): SessionMathRoundConfig {
  const t = sessionProgress(roundIndex, total);
  return {
    perQSeconds: Math.max(4, Math.round(12 - t * 7)),
    maxNum: Math.round(8 + t * 14),
    allowMultiply: roundIndex >= 2,
    allowDivide: roundIndex >= Math.floor(total * 0.55),
  };
}

export function sessionMazeSize(
  roundIndex: number,
  difficulty: GameDifficulty = "normal",
  total = GAME_SESSION_ROUNDS,
): number {
  switch (difficulty) {
    case "easy":
      return sessionScale(roundIndex, 5, 6, total);
    case "hard":
      return sessionScale(roundIndex, 9, 12, total);
    default:
      return sessionScale(roundIndex, 7, 8, total);
  }
}

export function sessionMazeMaxMoves(
  size: number,
  roundIndex: number,
  shortestPath = size * 2,
): number {
  const explorationRoom = Math.floor(size * size * 0.4) + roundIndex * 2;
  return Math.max(shortestPath * 2 + explorationRoom, size * 3);
}

export interface TargetTapWaveConfig {
  spawnMs: number;
  lifeMs: number;
}

export function sessionTargetTapWave(roundIndex: number, total = GAME_SESSION_ROUNDS): TargetTapWaveConfig {
  const t = sessionProgress(roundIndex, total);
  return {
    spawnMs: Math.max(450, Math.round(950 - t * 450)),
    lifeMs: Math.max(800, Math.round(1500 - t * 550)),
  };
}

export const TARGET_TAP_WAVE_MS = 6000;
