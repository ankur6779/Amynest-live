/** Display-only leveling — does not change XP math or storage schema. */

export type ExplorerLevelTitle = {
  level: number;
  title: string;
  emoji: string;
  minXp: number;
};

export const EXPLORER_LEVEL_LADDER: ExplorerLevelTitle[] = [
  { level: 1, title: "Explorer", emoji: "🧭", minXp: 0 },
  { level: 5, title: "Listener", emoji: "👂", minXp: 40 },
  { level: 10, title: "Discoverer", emoji: "🔍", minXp: 100 },
  { level: 25, title: "Adventurer", emoji: "🚀", minXp: 350 },
  { level: 50, title: "World Master", emoji: "👑", minXp: 900 },
];

export function resolveExplorerLevel(xp: number): ExplorerLevelTitle {
  let current = EXPLORER_LEVEL_LADDER[0]!;
  for (const row of EXPLORER_LEVEL_LADDER) {
    if (xp >= row.minXp) current = row;
  }
  return current;
}

export function nextExplorerLevel(xp: number): ExplorerLevelTitle | null {
  const current = resolveExplorerLevel(xp);
  const idx = EXPLORER_LEVEL_LADDER.findIndex((r) => r.level === current.level);
  return EXPLORER_LEVEL_LADDER[idx + 1] ?? null;
}

export function xpProgressToNextLevel(xp: number): { current: ExplorerLevelTitle; next: ExplorerLevelTitle | null; pct: number } {
  const current = resolveExplorerLevel(xp);
  const next = nextExplorerLevel(xp);
  if (!next) return { current, next: null, pct: 100 };
  const span = next.minXp - current.minXp;
  const pct = span > 0 ? Math.min(100, Math.round(((xp - current.minXp) / span) * 100)) : 100;
  return { current, next, pct };
}
