/**
 * Unified retention engine — streaks, shields, daily goals, achievements.
 * Pure functions; persistence via API `user_retention` table.
 */

export const STREAK_MILESTONES = [1, 3, 7, 14, 30, 100] as const;

export const CHECKIN_REWARDS = {
  stars: 5,
  coins: 10,
  parentXp: 15,
} as const;

export const GOAL_REWARDS = {
  stars: 3,
  coins: 5,
  parentXp: 10,
} as const;

export type DailyGoals = {
  routine: boolean;
  story: boolean;
  activity: boolean;
  speech: boolean;
};

export const EMPTY_DAILY_GOALS: DailyGoals = {
  routine: false,
  story: false,
  activity: false,
  speech: false,
};

export type RetentionState = {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  lastCheckinDate: string | null;
  shieldUsedMonth: string | null;
  totalStars: number;
  totalCoins: number;
  parentXp: number;
  dailyGoals: DailyGoals;
  goalsDate: string | null;
  achievements: string[];
  inactiveDays: number;
  winbackLevel: number;
};

export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function monthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = Date.parse(`${aIso}T00:00:00`);
  const b = Date.parse(`${bIso}T00:00:00`);
  return Math.round((b - a) / 86400000);
}

export function shieldAvailable(shieldUsedMonth: string | null, now: Date = new Date()): boolean {
  return shieldUsedMonth !== monthKey(now);
}

/** True when user missed exactly one day and can consume their monthly shield. */
export function canUseStreakShield(state: RetentionState, now: Date = new Date()): boolean {
  const today = todayIso(now);
  if (!state.lastActiveDate || state.currentStreak <= 0) return false;
  if (!shieldAvailable(state.shieldUsedMonth, now)) return false;
  if (state.lastCheckinDate === today) return false;
  return daysBetween(state.lastActiveDate, today) === 2;
}

export type CheckinResult = {
  next: RetentionState;
  alreadyCheckedIn: boolean;
  streakExtended: boolean;
  streakStarted: boolean;
  streakLost: boolean;
  shieldUsed: boolean;
  newMilestones: number[];
  rewards: { stars: number; coins: number; parentXp: number };
  newAchievements: string[];
};

export function resetGoalsIfNewDay(
  state: Pick<RetentionState, "dailyGoals" | "goalsDate">,
  now: Date = new Date(),
): DailyGoals {
  const today = todayIso(now);
  if (state.goalsDate === today) return state.dailyGoals;
  return { ...EMPTY_DAILY_GOALS };
}

export function recordDailyCheckin(
  state: RetentionState,
  opts?: { useShield?: boolean },
  now: Date = new Date(),
): CheckinResult {
  const today = todayIso(now);
  const rewards = { stars: 0, coins: 0, parentXp: 0 };
  const newAchievements: string[] = [];
  let streakExtended = false;
  let streakStarted = false;
  let streakLost = false;
  let shieldUsed = false;

  if (state.lastCheckinDate === today) {
    return {
      next: state,
      alreadyCheckedIn: true,
      streakExtended: false,
      streakStarted: false,
      streakLost: false,
      shieldUsed: false,
      newMilestones: [],
      rewards,
      newAchievements,
    };
  }

  let streak = state.currentStreak;
  const last = state.lastActiveDate;

  if (!last) {
    streak = 1;
    streakStarted = true;
  } else if (last === today) {
    /* same calendar day re-checkin after active */
  } else {
    const gap = daysBetween(last, today);
    if (gap === 1) {
      streak += 1;
      streakExtended = true;
    } else if (gap === 2 && opts?.useShield && shieldAvailable(state.shieldUsedMonth, now)) {
      streak += 1;
      streakExtended = true;
      shieldUsed = true;
    } else if (gap > 1) {
      if (streak > 0) streakLost = true;
      streak = 1;
      streakStarted = true;
    }
  }

  const longest = Math.max(state.longestStreak, streak);
  const newMilestones = STREAK_MILESTONES.filter(
    (m) => streak >= m && state.currentStreak < m,
  );

  rewards.stars = CHECKIN_REWARDS.stars;
  rewards.coins = CHECKIN_REWARDS.coins;
  rewards.parentXp = CHECKIN_REWARDS.parentXp;

  const achievements = [...state.achievements];
  if (streakStarted && !achievements.includes("streak_started")) {
    achievements.push("streak_started");
    newAchievements.push("streak_started");
  }
  for (const m of newMilestones) {
    const id = `streak_${m}`;
    if (!achievements.includes(id)) {
      achievements.push(id);
      newAchievements.push(id);
    }
  }

  const inactiveDays = last ? Math.max(0, daysBetween(last, today) - 1) : 0;
  let winbackLevel = 0;
  if (inactiveDays >= 14) winbackLevel = 4;
  else if (inactiveDays >= 7) winbackLevel = 3;
  else if (inactiveDays >= 3) winbackLevel = 2;
  else if (inactiveDays >= 1) winbackLevel = 1;

  const next: RetentionState = {
    ...state,
    currentStreak: streak,
    longestStreak: longest,
    lastActiveDate: today,
    lastCheckinDate: today,
    shieldUsedMonth: shieldUsed ? monthKey(now) : state.shieldUsedMonth,
    totalStars: state.totalStars + rewards.stars,
    totalCoins: state.totalCoins + rewards.coins,
    parentXp: state.parentXp + rewards.parentXp,
    dailyGoals: resetGoalsIfNewDay(state, now),
    goalsDate: today,
    achievements,
    inactiveDays: 0,
    winbackLevel: 0,
  };

  return {
    next,
    alreadyCheckedIn: false,
    streakExtended,
    streakStarted,
    streakLost,
    shieldUsed,
    newMilestones: [...newMilestones],
    rewards,
    newAchievements,
  };
}

export type GoalKey = keyof DailyGoals;

export type GoalCompleteResult = {
  next: RetentionState;
  allGoalsComplete: boolean;
  rewards: { stars: number; coins: number; parentXp: number };
  newAchievements: string[];
};

export function completeDailyGoal(
  state: RetentionState,
  goal: GoalKey,
  now: Date = new Date(),
): GoalCompleteResult {
  const today = todayIso(now);
  const goals =
    state.goalsDate === today ? { ...state.dailyGoals } : { ...EMPTY_DAILY_GOALS };
  if (goals[goal]) {
    return {
      next: state,
      allGoalsComplete: Object.values(goals).every(Boolean),
      rewards: { stars: 0, coins: 0, parentXp: 0 },
      newAchievements: [],
    };
  }
  goals[goal] = true;
  const allGoalsComplete = Object.values(goals).every(Boolean);
  const rewards = { ...GOAL_REWARDS };
  const newAchievements: string[] = [];
  const achievements = [...state.achievements];

  if (allGoalsComplete && !achievements.includes("daily_goals_complete")) {
    achievements.push("daily_goals_complete");
    newAchievements.push("daily_goals_complete");
    rewards.stars += 5;
    rewards.coins += 5;
    rewards.parentXp += 10;
  }

  const achievementByGoal: Partial<Record<GoalKey, string>> = {
    routine: "first_routine",
    story: "ten_stories",
    speech: "speech_star",
  };
  const maybe = achievementByGoal[goal];
  if (maybe && !achievements.includes(maybe)) {
    achievements.push(maybe);
    newAchievements.push(maybe);
  }

  return {
    next: {
      ...state,
      dailyGoals: goals,
      goalsDate: today,
      totalStars: state.totalStars + rewards.stars,
      totalCoins: state.totalCoins + rewards.coins,
      parentXp: state.parentXp + rewards.parentXp,
      achievements,
    },
    allGoalsComplete,
    rewards,
    newAchievements,
  };
}

export function computeParentingScore(input: {
  streak: number;
  goalsComplete: number;
  goalsTotal: number;
  routineCompletionPct?: number;
}): number {
  const goalPct =
    input.goalsTotal > 0
      ? Math.round((input.goalsComplete / input.goalsTotal) * 100)
      : 0;
  const streakBonus = Math.min(input.streak * 3, 30);
  const routineBonus = Math.round((input.routineCompletionPct ?? 0) * 0.4);
  return Math.min(Math.round(goalPct * 0.3 + streakBonus + routineBonus), 100);
}

export function computeWinbackLevel(inactiveDays: number): number {
  if (inactiveDays >= 14) return 4;
  if (inactiveDays >= 7) return 3;
  if (inactiveDays >= 3) return 2;
  if (inactiveDays >= 1) return 1;
  return 0;
}
