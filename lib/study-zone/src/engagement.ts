// Smart Study Zone — engagement layer (streaks, XP, daily goal).
// Pure helpers shared by web (localStorage) and mobile (AsyncStorage).
// No I/O here — callers pass the current EngagementState in and persist
// the returned next state.

export interface EngagementState {
  /** Total XP earned across all topics & play taps. */
  xp: number;
  /** Current daily streak in days (0 if today wasn't studied yet). */
  streak: number;
  /** Best streak ever achieved (for the badge bar). */
  bestStreak: number;
  /** ISO date (YYYY-MM-DD) of the last day with any activity. */
  lastActiveDate: string | null;
  /** ISO date (YYYY-MM-DD) of "today" the daily goal was last reset. */
  goalDate: string | null;
  /** Topics completed today toward the daily goal. */
  goalProgress: number;
  /** Earned badge ids (e.g. "streak-3", "perfect-math-addition", "xp-100"). */
  badges: string[];
}

export function emptyEngagement(): EngagementState {
  return {
    xp: 0,
    streak: 0,
    bestStreak: 0,
    lastActiveDate: null,
    goalDate: null,
    goalProgress: 0,
    badges: [],
  };
}

/** Daily goal target (topics completed per day). Tweak in one place. */
export const DAILY_GOAL_TARGET = 3;

/** XP awarded for various actions. Tweak in one place. */
export const XP_REWARDS = {
  playTap: 2,
  topicAttempt: 5,
  topicPass: 10,
  topicPerfect: 20,
  streakDay: 5,
} as const;

/** Streak milestones that earn a badge. */
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

/** XP milestones that earn a badge. */
export const XP_MILESTONES = [50, 100, 250, 500, 1000, 2500] as const;

/** Format an ISO date (YYYY-MM-DD) in the user's local timezone. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Difference in whole days between two YYYY-MM-DD strings. */
export function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(aIso + "T00:00:00");
  const b = Date.parse(bIso + "T00:00:00");
  return Math.round((b - a) / 86400000);
}

/**
 * Apply a study event to the engagement state. Returns the next state plus
 * the deltas (xpDelta, newStreak, leveledUp, newBadges) so the UI can
 * animate them.
 */
export interface ApplyResult {
  next: EngagementState;
  xpDelta: number;
  streakIncreased: boolean;
  newBadges: string[];
  goalReached: boolean;
}

export type StudyEvent =
  | { kind: "play-tap"; categoryId: string; itemId: string }
  | {
      kind: "topic-result";
      mode: "basic" | "advanced";
      subjectId: string;
      topicId: string;
      score: number;
      total: number;
    };

export function applyEvent(
  state: EngagementState,
  event: StudyEvent,
  now: Date = new Date(),
): ApplyResult {
  const today = todayIso(now);
  let xpDelta = 0;
  let goalReached = false;
  const newBadges: string[] = [];

  // 1) Compute XP for this event.
  if (event.kind === "play-tap") {
    xpDelta += XP_REWARDS.playTap;
  } else {
    const isPerfect = event.score === event.total && event.total > 0;
    const isPass = event.score >= Math.ceil(event.total * 0.6);
    xpDelta += XP_REWARDS.topicAttempt;
    if (isPerfect) xpDelta += XP_REWARDS.topicPerfect;
    else if (isPass) xpDelta += XP_REWARDS.topicPass;
    if (isPerfect) {
      const id = `perfect-${event.mode}-${event.subjectId}-${event.topicId}`;
      if (!state.badges.includes(id)) newBadges.push(id);
    }
  }

  // 2) Roll the streak.
  let streak = state.streak;
  let streakIncreased = false;
  if (state.lastActiveDate !== today) {
    if (state.lastActiveDate && daysBetween(state.lastActiveDate, today) === 1) {
      streak = state.streak + 1;
      streakIncreased = true;
      xpDelta += XP_REWARDS.streakDay;
    } else if (!state.lastActiveDate || daysBetween(state.lastActiveDate, today) > 1) {
      streak = 1;
      streakIncreased = state.streak === 0;
    }
  }

  // 3) Roll the daily goal.
  let goalProgress = state.goalDate === today ? state.goalProgress : 0;
  if (event.kind === "topic-result") {
    const isPass = event.score >= Math.ceil(event.total * 0.6);
    if (isPass) {
      const before = goalProgress;
      goalProgress = Math.min(DAILY_GOAL_TARGET, goalProgress + 1);
      if (before < DAILY_GOAL_TARGET && goalProgress >= DAILY_GOAL_TARGET) {
        goalReached = true;
      }
    }
  }

  const xp = state.xp + xpDelta;
  const bestStreak = Math.max(state.bestStreak, streak);

  // 4) Streak / XP milestone badges.
  for (const m of STREAK_MILESTONES) {
    if (streak >= m) {
      const id = `streak-${m}`;
      if (!state.badges.includes(id) && !newBadges.includes(id)) newBadges.push(id);
    }
  }
  for (const m of XP_MILESTONES) {
    if (xp >= m) {
      const id = `xp-${m}`;
      if (!state.badges.includes(id) && !newBadges.includes(id)) newBadges.push(id);
    }
  }
  if (goalReached) {
    const id = `goal-${today}`;
    if (!state.badges.includes(id) && !newBadges.includes(id)) newBadges.push(id);
  }

  const next: EngagementState = {
    xp,
    streak,
    bestStreak,
    lastActiveDate: today,
    goalDate: today,
    goalProgress,
    badges: [...state.badges, ...newBadges],
  };

  return { next, xpDelta, streakIncreased, newBadges, goalReached };
}

/**
 * If the parent opens the Study Zone but it's been more than a day since the
 * last activity, the displayed streak should drop to zero so we don't lie.
 * Pure: returns the freshened view of the state without mutating storage.
 */
export function viewState(
  state: EngagementState,
  now: Date = new Date(),
): EngagementState {
  const today = todayIso(now);
  if (!state.lastActiveDate) return state;
  const gap = daysBetween(state.lastActiveDate, today);
  if (gap > 1) {
    return { ...state, streak: 0 };
  }
  return state;
}

/**
 * Pretty label for a badge id. Returns null for unknown ids so the UI can
 * skip them safely.
 */
export function badgeLabel(id: string): { emoji: string; label: string } | null {
  if (id.startsWith("streak-")) {
    const days = id.slice("streak-".length);
    return { emoji: "🔥", label: `${days}-day streak` };
  }
  if (id.startsWith("xp-")) {
    const xp = id.slice("xp-".length);
    return { emoji: "⭐", label: `${xp} XP` };
  }
  if (id.startsWith("goal-")) {
    return { emoji: "🎯", label: "Daily goal" };
  }
  if (id.startsWith("perfect-")) {
    return { emoji: "🏆", label: "Perfect score" };
  }
  return null;
}
