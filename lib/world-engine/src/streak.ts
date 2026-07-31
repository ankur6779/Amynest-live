/** Shared play-streak math for Discovery Worlds + Animal World adapters. */

export function todayDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Calendar day immediately before `fromDay` (YYYY-MM-DD), UTC-stable. */
export function yesterdayDateKey(fromDay = todayDateKey()): string {
  const d = new Date(`${fromDay}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type PlayStreakState = {
  streakDays: number;
  lastPlayedDate: string | null;
};

export type PlayStreakUpdate = {
  streakDays: number;
  lastPlayedDate: string;
  /** True when lastPlayedDate advanced (new calendar day of play). */
  changed: boolean;
};

/**
 * Pure streak update. Same calendar day → no change.
 * Consecutive yesterday → increment; otherwise reset to 1.
 */
export function computePlayStreak(
  state: PlayStreakState,
  today = todayDateKey(),
): PlayStreakUpdate {
  if (state.lastPlayedDate === today) {
    return {
      streakDays: state.streakDays,
      lastPlayedDate: today,
      changed: false,
    };
  }
  const streakDays =
    state.lastPlayedDate === yesterdayDateKey(today) ? state.streakDays + 1 : 1;
  return { streakDays, lastPlayedDate: today, changed: true };
}

/** Convenience for WorldProgressV2 / session-stats shaped objects. */
export function applyPlayStreak<T extends PlayStreakState>(
  state: T,
  today = todayDateKey(),
): T {
  const next = computePlayStreak(state, today);
  if (!next.changed) return state;
  return { ...state, streakDays: next.streakDays, lastPlayedDate: next.lastPlayedDate };
}
