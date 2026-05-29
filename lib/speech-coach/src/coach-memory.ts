// ─────────────────────────────────────────────────────────────────────────────
// Amy Speech Coach — session memory & adaptive teacher profile
//
// Pure helpers: derive returning-child context from progress API + local snapshot.
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildCoachLearningJourney,
  type CoachLearningJourney,
  type CoachLocalSnapshot,
} from "./coach-journey";
import type { DailyTrendEntry, WeakSoundEntry } from "./weak-sounds";

export type { CoachLocalSnapshot, CoachLearningJourney } from "./coach-journey";
export { formatJourneySoundForSpeech as formatSoundForSpeech } from "./coach-journey";

export type CoachMemoryTone = "supportive" | "balanced" | "challenging";

export interface CoachSessionMemory {
  isReturning: boolean;
  practiceDaysThisWeek: number;
  consecutivePracticeDays: number;
  pronunciationPct: number;
  promptsAttempted: number;
  promptsClear: number;
  weakSounds: readonly Pick<WeakSoundEntry, "promptText" | "avgScore">[];
  lastSessionDate: string | null;
  lastSessionBestStreak: number;
  lastSessionScore: number;
  longestStreakEver: number;
  totalSessions: number;
  tone: CoachMemoryTone;
  journey: CoachLearningJourney;
}

export interface CoachProgressInput {
  promptsAttempted: number;
  promptsClear: number;
  pronunciationPct: number;
  streakDays: number;
  daysActive: number;
  dailyTrend: readonly DailyTrendEntry[];
  weakSounds: readonly WeakSoundEntry[];
}

const SUPPORTIVE_PRONUNCIATION_MAX = 54;
const CHALLENGING_PRONUNCIATION_MIN = 82;
const CHALLENGING_MIN_ATTEMPTS = 12;

/** Count consecutive calendar days with practice ending at the most recent active day. */
export function countConsecutivePracticeDays(
  dailyTrend: readonly DailyTrendEntry[],
): number {
  const activeDates = dailyTrend
    .filter((d) => d.attempts > 0)
    .map((d) => d.date)
    .sort();
  if (activeDates.length === 0) return 0;

  let streak = 1;
  for (let i = activeDates.length - 1; i > 0; i--) {
    const cur = new Date(`${activeDates[i]}T12:00:00Z`);
    const prev = new Date(`${activeDates[i - 1]}T12:00:00Z`);
    const diffDays = Math.round((cur.getTime() - prev.getTime()) / 86_400_000);
    if (diffDays === 1) streak += 1;
    else break;
  }
  return streak;
}

export function deriveCoachMemoryTone(
  pronunciationPct: number,
  promptsAttempted: number,
  weakSounds: readonly { avgScore: number }[],
): CoachMemoryTone {
  const weakAvg =
    weakSounds.length > 0
      ? weakSounds.reduce((s, w) => s + w.avgScore, 0) / weakSounds.length
      : pronunciationPct;

  if (
    pronunciationPct >= CHALLENGING_PRONUNCIATION_MIN &&
    promptsAttempted >= CHALLENGING_MIN_ATTEMPTS &&
    weakAvg >= 60
  ) {
    return "challenging";
  }
  if (pronunciationPct <= SUPPORTIVE_PRONUNCIATION_MAX || weakAvg < 48) {
    return "supportive";
  }
  return "balanced";
}

export function buildCoachSessionMemory(
  progress: CoachProgressInput,
  local: CoachLocalSnapshot | null,
): CoachSessionMemory {
  const consecutivePracticeDays = countConsecutivePracticeDays(progress.dailyTrend);
  const weakSounds = progress.weakSounds.map((w) => ({
    promptText: w.promptText,
    avgScore: w.avgScore,
  }));
  const tone = deriveCoachMemoryTone(
    progress.pronunciationPct,
    progress.promptsAttempted,
    weakSounds,
  );
  const journey = buildCoachLearningJourney(progress.weakSounds, local);

  const isReturning =
    progress.promptsAttempted > 0 ||
    (local?.totalSessions ?? 0) > 0;

  return {
    isReturning,
    practiceDaysThisWeek: progress.daysActive,
    consecutivePracticeDays,
    pronunciationPct: progress.pronunciationPct,
    promptsAttempted: progress.promptsAttempted,
    promptsClear: progress.promptsClear,
    weakSounds,
    lastSessionDate: local?.lastSessionDate ?? null,
    lastSessionBestStreak: local?.lastSessionBestStreak ?? 0,
    lastSessionScore: local?.lastSessionScore ?? 0,
    longestStreakEver: Math.max(
      local?.longestStreakEver ?? 0,
      local?.lastSessionBestStreak ?? 0,
    ),
    totalSessions: local?.totalSessions ?? 0,
    tone,
    journey,
  };
}

/** Whether a mid-session memory callback is allowed (rate limit). */
export function canUseMidSessionMemoryReference(
  memoryRefsUsed: number,
  turnIndex: number,
  sessionSeed: number,
): boolean {
  if (memoryRefsUsed >= 1) return false;
  if (turnIndex < 3) return false;
  const roll = Math.abs((sessionSeed ^ turnIndex * 97) % 100);
  return roll < 18;
}

/** Days since last local session snapshot, or null if unknown. */
export function daysSinceLastSession(lastSessionDate: string | null): number | null {
  if (!lastSessionDate) return null;
  const last = new Date(`${lastSessionDate}T12:00:00Z`);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.round((today.getTime() - last.getTime()) / 86_400_000);
}
