/**
 * Device-local visit streaks — no backend.
 */

const STREAK_KEY_PREFIX = "talking_amy_streak_v1_";

export type TalkingAmyStreakState = {
  visitDates: string[];
  currentStreak: number;
};

function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function dayDiff(a: string, b: string): number {
  const ms = parseDateKey(b).getTime() - parseDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function loadTalkingAmyStreak(childId: number): TalkingAmyStreakState {
  if (typeof window === "undefined") {
    return { visitDates: [], currentStreak: 0 };
  }
  const parsed = readJson<Partial<TalkingAmyStreakState>>(
    window.localStorage.getItem(`${STREAK_KEY_PREFIX}${childId}`),
    { visitDates: [], currentStreak: 0 },
  );
  const visitDates = Array.isArray(parsed.visitDates)
    ? [...new Set(parsed.visitDates.filter((d) => typeof d === "string"))].sort()
    : [];
  return {
    visitDates,
    currentStreak: Math.max(0, Number(parsed.currentStreak) || 0),
  };
}

function writeStreak(childId: number, state: TalkingAmyStreakState): TalkingAmyStreakState {
  if (typeof window === "undefined") return state;
  window.localStorage.setItem(`${STREAK_KEY_PREFIX}${childId}`, JSON.stringify(state));
  return state;
}

function computeStreakFromDates(visitDates: string[]): number {
  if (!visitDates.length) return 0;
  const sorted = [...visitDates].sort();
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    if (dayDiff(sorted[i - 1]!, sorted[i]!) === 1) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export type TalkingAmyVisitResult = {
  streak: TalkingAmyStreakState;
  isFirstUseToday: boolean;
  streakDay: number;
};

/**
 * Record a visit for today. Returns whether this is the first open today and current streak length.
 */
export function recordTalkingAmyVisit(
  childId: number,
  date = new Date(),
): TalkingAmyVisitResult {
  const today = localDateKey(date);
  const current = loadTalkingAmyStreak(childId);
  const isFirstUseToday = !current.visitDates.includes(today);
  const visitDates = isFirstUseToday
    ? [...current.visitDates, today].sort()
    : current.visitDates;
  const currentStreak = computeStreakFromDates(visitDates);
  const streak = writeStreak(childId, { visitDates, currentStreak });
  return {
    streak,
    isFirstUseToday,
    streakDay: currentStreak,
  };
}

export function getStreakMilestoneMessage(streakDay: number): string | null {
  if (streakDay >= 30) return "Amazing! You're a Talking Amy Superstar!";
  if (streakDay === 7) return "One whole week together!";
  if (streakDay === 2) return "Welcome back!";
  return null;
}
