import type { SpellingCatalogEntry, SpellingDifficulty } from "./types.js";

/** Max catalog mastery gate for player levels beyond 50. */
export const MAX_PLAYER_LEVEL = 50;

/** Words unlocked at player level L (masteryLevel <= L). */
export function filterByPlayerLevel(
  entries: SpellingCatalogEntry[],
  playerLevel: number,
): SpellingCatalogEntry[] {
  const level = Math.max(1, Math.min(MAX_PLAYER_LEVEL, Math.floor(playerLevel)));
  return entries.filter((e) => e.masteryLevel <= level);
}

/** Suggested difficulty mix as player level rises. */
export function recommendedDifficulties(playerLevel: number): SpellingDifficulty[] {
  if (playerLevel < 10) return ["easy"];
  if (playerLevel < 25) return ["easy", "medium"];
  return ["easy", "medium", "hard"];
}

export function starsForNextLevel(currentLevel: number): number {
  return 10;
}

export function levelFromStars(totalStars: number): number {
  return Math.min(MAX_PLAYER_LEVEL, Math.floor(totalStars / 10) + 1);
}
