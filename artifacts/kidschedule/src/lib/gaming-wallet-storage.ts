import type { LedgerEntry } from "@/lib/rewards";
import type { GameCategory } from "@/lib/games";
import {
  sanitizeLedger,
  sanitizePlayLog,
  sanitizeSkillRecord,
  sanitizeUnlockedGames,
} from "@/lib/game-storage-sanitize";

export const POINTS_KEY = "amynest_points";
export const UNLOCKED_KEY = "amynest_unlocked_games_v1";
export const PLAY_LOG_KEY = "amynest_game_play_log_v1";
export const SKILLS_KEY = "amynest_skill_progress_v1";
export const LEDGER_KEY = "amynest_ledger";
/** Soft owner stamp so account-switch cannot push another user's mirror. */
export const WALLET_OWNER_KEY = "amynest_gaming_wallet_owner_v1";

const WALLET_MIRROR_KEYS = [
  POINTS_KEY,
  UNLOCKED_KEY,
  PLAY_LOG_KEY,
  SKILLS_KEY,
  LEDGER_KEY,
  WALLET_OWNER_KEY,
] as const;

export function readWalletOwner(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(WALLET_OWNER_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function stampWalletOwner(userId: string | null | undefined): void {
  if (typeof localStorage === "undefined" || !userId) return;
  try {
    localStorage.setItem(WALLET_OWNER_KEY, userId);
  } catch {
    /* private mode */
  }
}

/** Wipe device-global gaming mirrors (points/unlocks/skills/playLog/ledger). */
export function clearLocalGamingWallet(): void {
  if (typeof localStorage === "undefined") return;
  try {
    for (const key of WALLET_MIRROR_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    /* private mode */
  }
}

/**
 * True when local wallet mirrors are safe to POST under `userId`.
 * Rejects stamped foreign owners and leftover mirrors while session uid
 * still points at a different account (clearUserSessionCaches may lag).
 */
export function localWalletBelongsTo(
  userId: string | null | undefined,
  sessionUid?: string | null,
): boolean {
  if (!userId) return false;
  const owner = readWalletOwner();
  if (owner) return owner === userId;
  if (sessionUid && sessionUid !== userId) return false;
  return true;
}

export interface PlayLogEntry {
  id: string;
  date: string;
  pointsEarned: number;
  perfect: boolean;
  score?: number;
  total?: number;
}

export type SkillRecord = Record<
  GameCategory,
  { attempts: number; correct: number; plays: number }
>;

export interface WalletSnapshotPayload {
  pointsBalance: number;
  unlockedGames: string[];
  skills: Record<string, { attempts: number; correct: number; plays: number }>;
  playLog: PlayLogEntry[];
  ledger: LedgerEntry[];
  routineStreakDays?: number;
}

export function readLocalWalletPartial(): WalletSnapshotPayload {
  let unlocked: string[] = [];
  let playLog: PlayLogEntry[] = [];
  let skills: WalletSnapshotPayload["skills"] = {};
  let ledger: LedgerEntry[] = [];
  try {
    unlocked = sanitizeUnlockedGames(JSON.parse(localStorage.getItem(UNLOCKED_KEY) ?? "[]"));
  } catch {
    /* ignore */
  }
  try {
    playLog = sanitizePlayLog(JSON.parse(localStorage.getItem(PLAY_LOG_KEY) ?? "[]"));
  } catch {
    /* ignore */
  }
  try {
    skills = sanitizeSkillRecord(JSON.parse(localStorage.getItem(SKILLS_KEY) ?? "{}"));
  } catch {
    /* ignore */
  }
  try {
    ledger = sanitizeLedger(JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "[]"));
  } catch {
    /* ignore */
  }
  return {
    pointsBalance: parseInt(localStorage.getItem(POINTS_KEY) ?? "0", 10) || 0,
    unlockedGames: unlocked,
    skills,
    playLog,
    ledger,
  };
}

export function applyWalletSnapshot(
  snapshot: WalletSnapshotPayload,
  ownerUserId?: string | null,
): void {
  const safe = {
    pointsBalance: Math.max(0, Math.floor(snapshot.pointsBalance ?? 0)),
    unlockedGames: sanitizeUnlockedGames(snapshot.unlockedGames),
    playLog: sanitizePlayLog(snapshot.playLog),
    skills: sanitizeSkillRecord(snapshot.skills),
    ledger: sanitizeLedger(snapshot.ledger),
    routineStreakDays: snapshot.routineStreakDays,
  };
  localStorage.setItem(POINTS_KEY, String(safe.pointsBalance));
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify(safe.unlockedGames));
  localStorage.setItem(PLAY_LOG_KEY, JSON.stringify(safe.playLog));
  localStorage.setItem(SKILLS_KEY, JSON.stringify(safe.skills));
  localStorage.setItem(LEDGER_KEY, JSON.stringify(safe.ledger));
  if (ownerUserId) stampWalletOwner(ownerUserId);
  if (safe.routineStreakDays != null) {
    import("@/lib/routine-streak-cache").then(({ cacheRoutineStreak }) => {
      cacheRoutineStreak(safe.routineStreakDays!);
    });
  }
}
