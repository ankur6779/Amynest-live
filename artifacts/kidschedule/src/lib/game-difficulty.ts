export type GameDifficulty = "easy" | "normal" | "hard";

const DIFFICULTY_KEY = "amynest_game_difficulty_v1";

export const DIFFICULTY_LABEL: Record<GameDifficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

export function getGameDifficulty(): GameDifficulty {
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    if (raw === "easy" || raw === "normal" || raw === "hard") return raw;
  } catch {
    /* ignore */
  }
  return "normal";
}

export function setGameDifficulty(level: GameDifficulty): void {
  localStorage.setItem(DIFFICULTY_KEY, level);
}

export const MAZE_CONFIG: Record<GameDifficulty, { size: number; maxMoves: number }> = {
  easy: { size: 5, maxMoves: 45 },
  normal: { size: 5, maxMoves: 40 },
  hard: { size: 7, maxMoves: 60 },
};

export const SPEED_MATH_CONFIG: Record<
  GameDifficulty,
  { total: number; perQSeconds: number; maxNum: number; allowMultiply: boolean; allowDivide: boolean }
> = {
  easy: { total: 5, perQSeconds: 12, maxNum: 10, allowMultiply: false, allowDivide: false },
  normal: { total: 6, perQSeconds: 8, maxNum: 12, allowMultiply: true, allowDivide: false },
  hard: { total: 8, perQSeconds: 6, maxNum: 20, allowMultiply: true, allowDivide: true },
};

export const SEQUENCE_CONFIG: Record<GameDifficulty, { length: number }> = {
  easy: { length: 4 },
  normal: { length: 6 },
  hard: { length: 8 },
};

export const COLOR_MEMORY_CONFIG: Record<GameDifficulty, { rounds: number[] }> = {
  easy: { rounds: [3, 3, 4] },
  normal: { rounds: [3, 4, 5, 5] },
  hard: { rounds: [4, 5, 6, 6, 7] },
};
