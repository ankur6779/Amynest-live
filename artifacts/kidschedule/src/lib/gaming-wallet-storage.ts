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

export function applyWalletSnapshot(snapshot: WalletSnapshotPayload): void {
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
  if (safe.routineStreakDays != null) {
    import("@/lib/routine-streak-cache").then(({ cacheRoutineStreak }) => {
      cacheRoutineStreak(safe.routineStreakDays!);
    });
  }
}

/**
 * Drop device-global gaming wallet keys on sign-out / account switch.
 * Leftover points/unlocks/playLog would otherwise POST via syncWalletFromClient
 * under the next uid (Math.max merge + unlock union → permanent wrong-account writes).
 */
export function clearLocalGamingWallet(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(POINTS_KEY);
    localStorage.removeItem(UNLOCKED_KEY);
    localStorage.removeItem(PLAY_LOG_KEY);
    localStorage.removeItem(SKILLS_KEY);
    localStorage.removeItem(LEDGER_KEY);
  } catch {
    /* private mode */
  }
}
