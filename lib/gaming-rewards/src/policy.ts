import {
  DAILY_LIMIT_FREE,
  DAILY_LIMIT_PREMIUM,
  FREE_STARTER_GAME_IDS,
  STREAK_UNLOCK_DAYS,
  getGameById,
  isFreeStarter,
  type GameCatalogEntry,
} from "./catalog";

export type SkillRecord = Record<
  string,
  { attempts: number; correct: number; plays: number }
>;

export interface PlayLogEntry {
  id: string;
  date: string;
  pointsEarned: number;
  perfect: boolean;
  score?: number;
  total?: number;
}

export interface LedgerEntry {
  date: string;
  childName: string;
  activity: string;
  points: number;
  idempotencyKey?: string;
}

export function dailyLimit(isPremium: boolean): number {
  return isPremium ? DAILY_LIMIT_PREMIUM : DAILY_LIMIT_FREE;
}

export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function gamesPlayedToday(playLog: PlayLogEntry[]): number {
  const today = todayUtc();
  return playLog.filter((e) => e.date.startsWith(today)).length;
}

export function dailyLimitReached(playLog: PlayLogEntry[], isPremium: boolean): boolean {
  return gamesPlayedToday(playLog) >= dailyLimit(isPremium);
}

export function isGameUnlockedForPlay(
  id: string,
  unlocked: string[],
  isPremium: boolean,
): boolean {
  if (isPremium) return true;
  if (isFreeStarter(id)) return true;
  return unlocked.includes(id);
}

export function canPlayGame(
  game: GameCatalogEntry,
  unlocked: string[],
  isPremium: boolean,
): boolean {
  if (game.status !== "ready") return false;
  if (game.premiumOnly && !isPremium) return false;
  return isGameUnlockedForPlay(game.id, unlocked, isPremium);
}

export function computePointsEarned(
  game: GameCatalogEntry,
  score: number,
  total: number,
): { perfect: boolean; pointsEarned: number } {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeScore = Math.max(0, Math.min(safeTotal, Math.floor(score)));
  const ratio = safeScore / safeTotal;
  const perfect = ratio >= 0.95;
  const pointsEarned = perfect
    ? game.rewardMax
    : Math.max(
        game.rewardMin,
        Math.round(game.rewardMin + (game.rewardMax - game.rewardMin) * ratio),
      );
  return { perfect, pointsEarned };
}

export type UnlockResult =
  | { ok: true; via: "points" | "streak" | "premium" | "starter" | "already" }
  | { ok: false; reason: string };

export function unlockGameId(
  gameId: string,
  state: {
    pointsBalance: number;
    unlocked: string[];
    routineStreakDays: number;
    isPremium: boolean;
  },
): UnlockResult & { unlocked?: string[]; pointsBalance?: number } {
  const game = getGameById(gameId);
  if (!game) return { ok: false, reason: "Game not found." };
  if (game.premiumOnly && !state.isPremium) {
    return { ok: false, reason: "This game is included with Premium." };
  }
  if (isGameUnlockedForPlay(gameId, state.unlocked, state.isPremium)) {
    return { ok: true, via: "already", unlocked: state.unlocked, pointsBalance: state.pointsBalance };
  }

  let unlocked = [...state.unlocked];
  let pointsBalance = state.pointsBalance;

  if (state.isPremium || isFreeStarter(gameId)) {
    if (!unlocked.includes(gameId)) unlocked.push(gameId);
    return {
      ok: true,
      via: state.isPremium ? "premium" : "starter",
      unlocked,
      pointsBalance,
    };
  }

  if (pointsBalance >= game.unlockCost) {
    pointsBalance -= game.unlockCost;
    unlocked.push(gameId);
    return { ok: true, via: "points", unlocked, pointsBalance };
  }

  if (state.routineStreakDays >= STREAK_UNLOCK_DAYS) {
    unlocked.push(gameId);
    return { ok: true, via: "streak", unlocked, pointsBalance };
  }

  return {
    ok: false,
    reason: `Need ${game.unlockCost} points (have ${pointsBalance}), or a ${STREAK_UNLOCK_DAYS}-day routine streak (current: ${state.routineStreakDays} days).`,
  };
}

export { FREE_STARTER_GAME_IDS, STREAK_UNLOCK_DAYS, DAILY_LIMIT_FREE, DAILY_LIMIT_PREMIUM };
