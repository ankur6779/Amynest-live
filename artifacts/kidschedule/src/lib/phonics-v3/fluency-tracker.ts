/**
 * Reading fluency tracking — words, stories, streaks, 7/30/90-day trends.
 */

export type FluencyDailySnapshot = {
  dateKey: string;
  wordsAttempted: number;
  wordsCompleted: number;
  storiesCompleted: number;
  fluencyScore: number;
};

export type PhonicsFluencyState = {
  streakDays: number;
  lastActiveDate: string;
  wordsAttemptedTotal: number;
  wordsCompletedTotal: number;
  storiesCompletedTotal: number;
  daily: FluencyDailySnapshot[];
  version: 3;
};

const STORAGE_PREFIX = "amynest:phonics-v3-fluency:";
const MAX_DAILY = 120;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function defaultFluencyState(): PhonicsFluencyState {
  return {
    streakDays: 0,
    lastActiveDate: "",
    wordsAttemptedTotal: 0,
    wordsCompletedTotal: 0,
    storiesCompletedTotal: 0,
    daily: [],
    version: 3,
  };
}

export function loadFluencyState(childId: number): PhonicsFluencyState {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${childId}`);
    if (!raw) return defaultFluencyState();
    return { ...defaultFluencyState(), ...JSON.parse(raw) };
  } catch {
    return defaultFluencyState();
  }
}

export function saveFluencyState(childId: number, state: PhonicsFluencyState): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${childId}`, JSON.stringify(state));
  } catch {
    /* quota */
  }
}

/** Fluency score 0–100 from completion ratio + consistency. */
export function computeFluencyScore(
  wordsAttempted: number,
  wordsCompleted: number,
  storiesCompleted: number,
): number {
  if (wordsAttempted === 0) return storiesCompleted > 0 ? 40 : 0;
  const accuracy = wordsCompleted / wordsAttempted;
  const storyBoost = Math.min(20, storiesCompleted * 5);
  return Math.round(Math.min(100, accuracy * 80 + storyBoost));
}

function upsertDaily(
  daily: FluencyDailySnapshot[],
  patch: Partial<FluencyDailySnapshot>,
): FluencyDailySnapshot[] {
  const dateKey = patch.dateKey ?? todayKey();
  const idx = daily.findIndex((d) => d.dateKey === dateKey);
  const base: FluencyDailySnapshot =
    idx >= 0
      ? daily[idx]!
      : {
          dateKey,
          wordsAttempted: 0,
          wordsCompleted: 0,
          storiesCompleted: 0,
          fluencyScore: 0,
        };
  const merged = { ...base, ...patch, dateKey };
  merged.fluencyScore = computeFluencyScore(
    merged.wordsAttempted,
    merged.wordsCompleted,
    merged.storiesCompleted,
  );
  const next = idx >= 0 ? [...daily] : [...daily, merged];
  if (idx >= 0) next[idx] = merged;
  return next.slice(-MAX_DAILY);
}

export function recordWordAttempt(
  state: PhonicsFluencyState,
  completed: boolean,
): PhonicsFluencyState {
  const today = todayKey();
  const yesterday = daysAgoKey(1);
  let streak = state.streakDays;
  if (state.lastActiveDate === yesterday) streak += 1;
  else if (state.lastActiveDate !== today) streak = 1;

  const daily = upsertDaily(state.daily, {
    wordsAttempted:
      (state.daily.find((d) => d.dateKey === today)?.wordsAttempted ?? 0) + 1,
    wordsCompleted:
      (state.daily.find((d) => d.dateKey === today)?.wordsCompleted ?? 0) +
      (completed ? 1 : 0),
  });

  return {
    ...state,
    streakDays: streak,
    lastActiveDate: today,
    wordsAttemptedTotal: state.wordsAttemptedTotal + 1,
    wordsCompletedTotal: state.wordsCompletedTotal + (completed ? 1 : 0),
    daily,
  };
}

export function recordStoryComplete(state: PhonicsFluencyState): PhonicsFluencyState {
  const today = todayKey();
  const daily = upsertDaily(state.daily, {
    storiesCompleted:
      (state.daily.find((d) => d.dateKey === today)?.storiesCompleted ?? 0) + 1,
  });
  return {
    ...state,
    storiesCompletedTotal: state.storiesCompletedTotal + 1,
    daily,
  };
}

export function fluencyTrend(
  state: PhonicsFluencyState,
  windowDays: 7 | 30 | 90,
): { avgScore: number; wordsCompleted: number; storiesCompleted: number } {
  const cutoff = daysAgoKey(windowDays);
  const window = state.daily.filter((d) => d.dateKey >= cutoff);
  if (window.length === 0) {
    return { avgScore: 0, wordsCompleted: 0, storiesCompleted: 0 };
  }
  const avgScore = Math.round(
    window.reduce((s, d) => s + d.fluencyScore, 0) / window.length,
  );
  return {
    avgScore,
    wordsCompleted: window.reduce((s, d) => s + d.wordsCompleted, 0),
    storiesCompleted: window.reduce((s, d) => s + d.storiesCompleted, 0),
  };
}
