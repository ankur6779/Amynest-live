/** Server-safe game catalog — keep in sync with kidschedule `lib/games.ts` UI fields. */

export type GameCategory =
  | "brain" | "memory" | "math" | "focus" | "creativity" | "behavior" | "action" | "puzzle";

export interface GameCatalogEntry {
  id: string;
  category: GameCategory;
  unlockCost: number;
  rewardMin: number;
  rewardMax: number;
  status: "ready" | "soon";
  premiumOnly?: boolean;
}

export const FREE_STARTER_GAME_IDS = ["pattern-match", "what-should-you-do"] as const;

export const DAILY_LIMIT_FREE = 3;
export const DAILY_LIMIT_PREMIUM = 12;
export const STREAK_UNLOCK_DAYS = 5;
export const MAX_ROUTINE_EARN_PER_EVENT = 50;

export const GAME_CATALOG: GameCatalogEntry[] = [
  { id: "pattern-match", category: "brain", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "odd-one-out", category: "brain", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "card-flip", category: "memory", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "sequence", category: "memory", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "color-memory", category: "memory", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "speed-math", category: "math", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "number-match", category: "math", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "find-mistake", category: "focus", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "target-tap", category: "action", unlockCost: 50, rewardMin: 5, rewardMax: 15, status: "ready" },
  { id: "what-should-you-do", category: "behavior", unlockCost: 50, rewardMin: 8, rewardMax: 15, status: "ready" },
  { id: "spot-difference", category: "focus", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready", premiumOnly: true },
  { id: "hidden-objects", category: "focus", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready", premiumOnly: true },
  { id: "color-fill", category: "creativity", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready" },
  { id: "shape-match", category: "creativity", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready" },
  { id: "maze-escape", category: "action", unlockCost: 60, rewardMin: 5, rewardMax: 12, status: "ready" },
];

const byId = new Map(GAME_CATALOG.map((g) => [g.id, g]));

export function getGameById(id: string): GameCatalogEntry | undefined {
  return byId.get(id);
}

export function isFreeStarter(id: string): boolean {
  return (FREE_STARTER_GAME_IDS as readonly string[]).includes(id);
}
