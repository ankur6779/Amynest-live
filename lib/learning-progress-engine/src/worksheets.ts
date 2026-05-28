import type { UnlockResult } from "./types";
import { dailyUnlockSeed } from "./daily-freshness";

export interface WorksheetPick {
  id: string;
  name: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  reason: string;
}

export interface WorksheetCatalogItem {
  id: string;
  name: string;
  category: string;
}

const DIFFICULTY_BY_CATEGORY: Record<string, "easy" | "medium" | "hard"> = {
  coloring: "easy",
  tracing: "easy",
  alphabet: "easy",
  numbers: "easy",
  general: "medium",
  math: "medium",
};

function categoryMatchesDifficulty(
  category: string,
  target: "easy" | "medium" | "hard",
): boolean {
  const base = DIFFICULTY_BY_CATEGORY[category] ?? "medium";
  if (target === "easy") return base === "easy";
  if (target === "hard") return category === "math";
  return base === "medium" || base === "easy";
}

/**
 * Daily worksheet path — skill-matched picks from catalog using unlock difficulty.
 */
export function pickDailyWorksheets(
  catalog: WorksheetCatalogItem[],
  unlocks: UnlockResult,
  opts: { childId: number | string; dateIso?: string; count?: number },
): WorksheetPick[] {
  const count = opts.count ?? 3;
  const seed = dailyUnlockSeed(
    opts.dateIso ?? new Date().toISOString().slice(0, 10),
    `${opts.childId}_ws`,
  );
  const difficulty = unlocks.worksheetDifficulty;

  const pool = catalog.filter((w) =>
    categoryMatchesDifficulty(w.category, difficulty),
  );
  const fallback = catalog.length > 0 ? catalog : pool;
  const source = pool.length >= count ? pool : fallback;

  const picks: WorksheetPick[] = [];
  for (let i = 0; i < count && source.length > 0; i++) {
    const ws = source[(seed + i) % source.length]!;
    if (picks.some((p) => p.id === ws.id)) continue;
    picks.push({
      id: ws.id,
      name: ws.name,
      category: ws.category,
      difficulty,
      reason:
        difficulty === "easy"
          ? "Foundation practice"
          : difficulty === "hard"
            ? "Challenge worksheet"
            : "Daily skill match",
    });
  }
  return picks;
}

export function worksheetProgressSummary(completedIds: string[], totalSeen: number): {
  completed: number;
  percent: number;
  label: string;
} {
  const completed = completedIds.length;
  const percent =
    totalSeen > 0 ? Math.min(100, Math.round((completed / totalSeen) * 100)) : 0;
  return {
    completed,
    percent,
    label: `${completed} worksheets completed`,
  };
}
