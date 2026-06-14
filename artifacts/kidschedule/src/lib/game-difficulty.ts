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

export const MAZE_CONFIG: Record<GameDifficulty, { minSize: number; maxSize: number }> = {
  easy: { minSize: 5, maxSize: 6 },
  normal: { minSize: 7, maxSize: 8 },
  hard: { minSize: 9, maxSize: 12 },
};

export const SPEED_MATH_CONFIG: Record<
  GameDifficulty,
  { perQSecondsBonus: number; maxNumBonus: number }
> = {
  easy: { perQSecondsBonus: 3, maxNumBonus: -4 },
  normal: { perQSecondsBonus: 0, maxNumBonus: 0 },
  hard: { perQSecondsBonus: -2, maxNumBonus: 4 },
};

/** Flash speed ms — lower is harder (used by sequence / color memory). */
export const SEQUENCE_FLASH_MS: Record<GameDifficulty, number> = {
  easy: 750,
  normal: 600,
  hard: 450,
};

export const COLOR_MEMORY_FLASH_MS: Record<GameDifficulty, number> = {
  easy: 800,
  normal: 650,
  hard: 500,
};
