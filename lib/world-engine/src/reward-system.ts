import type { WorldProgressV2 } from "./progress-types.js";
import { resolvePlatformExplorerTier } from "./progress-types.js";

export const PLATFORM_XP_REWARDS = {
  soundPlayed: 2,
  itemOpened: 5,
  quizCorrect: 8,
  hearFindCorrect: 10,
  discoverySession: 15,
  favoriteAdded: 3,
} as const;

export type PlatformXpKind = keyof typeof PLATFORM_XP_REWARDS;

export function addPlatformXp(
  progress: WorldProgressV2,
  kind: PlatformXpKind,
): WorldProgressV2 {
  const xp = progress.xp + PLATFORM_XP_REWARDS[kind];
  return { ...progress, xp, explorerTier: resolvePlatformExplorerTier(xp) };
}
