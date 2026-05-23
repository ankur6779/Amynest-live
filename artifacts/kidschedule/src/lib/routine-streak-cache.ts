/** Cached from dashboard routine list — used for streak-based game unlocks. */
export const ROUTINE_STREAK_CACHE_KEY = "amynest_routine_streak_v1";

/** Routine days in a row required to unlock a game without spending points. */
export const STREAK_UNLOCK_DAYS = 5;

export function cacheRoutineStreak(streak: number): void {
  try {
    localStorage.setItem(
      ROUTINE_STREAK_CACHE_KEY,
      String(Math.max(0, Math.floor(streak))),
    );
  } catch {
    /* private mode */
  }
}

export function getCachedRoutineStreak(): number {
  try {
    return parseInt(localStorage.getItem(ROUTINE_STREAK_CACHE_KEY) ?? "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function canUnlockGameWithStreak(): boolean {
  return getCachedRoutineStreak() >= STREAK_UNLOCK_DAYS;
}
