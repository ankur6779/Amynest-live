import type { LedgerEntry } from "@/lib/rewards";
import type { GameCategory } from "@/lib/games";

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
  try { unlocked = JSON.parse(localStorage.getItem(UNLOCKED_KEY) ?? "[]"); } catch { /* */ }
  try { playLog = JSON.parse(localStorage.getItem(PLAY_LOG_KEY) ?? "[]"); } catch { /* */ }
  try { skills = JSON.parse(localStorage.getItem(SKILLS_KEY) ?? "{}"); } catch { /* */ }
  try { ledger = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? "[]"); } catch { /* */ }
  return {
    pointsBalance: parseInt(localStorage.getItem(POINTS_KEY) ?? "0", 10) || 0,
    unlockedGames: unlocked,
    skills,
    playLog,
    ledger,
  };
}

export function applyWalletSnapshot(snapshot: WalletSnapshotPayload): void {
  localStorage.setItem(POINTS_KEY, String(snapshot.pointsBalance));
  localStorage.setItem(UNLOCKED_KEY, JSON.stringify(snapshot.unlockedGames));
  localStorage.setItem(PLAY_LOG_KEY, JSON.stringify(snapshot.playLog));
  localStorage.setItem(SKILLS_KEY, JSON.stringify(snapshot.skills));
  localStorage.setItem(LEDGER_KEY, JSON.stringify(snapshot.ledger));
  if (snapshot.routineStreakDays != null) {
    import("@/lib/routine-streak-cache").then(({ cacheRoutineStreak }) => {
      cacheRoutineStreak(snapshot.routineStreakDays!);
    });
  }
}
