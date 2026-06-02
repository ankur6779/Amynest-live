import type { WorldId } from "./types.js";

export type ExplorerTier = "none" | "bronze" | "silver" | "gold";

export const PLATFORM_EXPLORER_TIER_XP: Record<Exclude<ExplorerTier, "none">, number> = {
  bronze: 50,
  silver: 200,
  gold: 500,
};

export type WorldItemMastery = {
  soundsPlayed: number;
  quizzesCorrect: number;
  hearFindCorrect: number;
  hearFindAttempts: number;
};

export type WorldProgressV2 = {
  worldId: WorldId;
  xp: number;
  explorerTier: ExplorerTier;
  itemMastery: Record<string, WorldItemMastery>;
  stickersEarned: string[];
  achievementsUnlocked: string[];
  hearFindSessions: number;
  hearFindCorrectTotal: number;
  hearFindAttemptTotal: number;
  quizCorrectTotal: number;
  discoverySessionsCompleted: number;
  weeklyMinutes: Record<string, number>;
  monthlyItemsOpened: Record<string, number>;
  favorites: string[];
  totalSessionMs: number;
  streakDays: number;
  lastPlayedDate: string | null;
};

export function defaultWorldItemMastery(): WorldItemMastery {
  return {
    soundsPlayed: 0,
    quizzesCorrect: 0,
    hearFindCorrect: 0,
    hearFindAttempts: 0,
  };
}

export function defaultWorldProgressV2(worldId: WorldId): WorldProgressV2 {
  return {
    worldId,
    xp: 0,
    explorerTier: "none",
    itemMastery: {},
    stickersEarned: [],
    achievementsUnlocked: [],
    hearFindSessions: 0,
    hearFindCorrectTotal: 0,
    hearFindAttemptTotal: 0,
    quizCorrectTotal: 0,
    discoverySessionsCompleted: 0,
    weeklyMinutes: {},
    monthlyItemsOpened: {},
    favorites: [],
    totalSessionMs: 0,
    streakDays: 0,
    lastPlayedDate: null,
  };
}

export function resolvePlatformExplorerTier(xp: number): ExplorerTier {
  if (xp >= PLATFORM_EXPLORER_TIER_XP.gold) return "gold";
  if (xp >= PLATFORM_EXPLORER_TIER_XP.silver) return "silver";
  if (xp >= PLATFORM_EXPLORER_TIER_XP.bronze) return "bronze";
  return "none";
}
