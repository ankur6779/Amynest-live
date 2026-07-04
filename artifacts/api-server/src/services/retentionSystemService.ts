import { eq, gte } from "drizzle-orm";
import {
  db,
  userRetentionTable,
  type RetentionDailyGoals,
  type RetentionPreferences,
  type RetentionResumeItem,
  type WeeklySummaryCache,
  type UserRetention,
} from "@workspace/db";
import {
  completeDailyGoal,
  computeParentingScore,
  computeWinbackLevel,
  canUseStreakShield,
  recordDailyCheckin,
  resetGoalsIfNewDay,
  shieldAvailable,
  todayIso,
  type GoalKey,
  type RetentionState,
} from "@workspace/retention-system";

function toState(row: UserRetention): RetentionState {
  return {
    currentStreak: row.currentStreak,
    longestStreak: row.longestStreak,
    lastActiveDate: row.lastActiveDate ?? null,
    lastCheckinDate: row.lastCheckinDate ?? null,
    shieldUsedMonth: row.shieldUsedMonth ?? null,
    totalStars: row.totalStars,
    totalCoins: row.totalCoins,
    parentXp: row.parentXp,
    dailyGoals: resetGoalsIfNewDay({
      dailyGoals: row.dailyGoals,
      goalsDate: row.goalsDate ?? null,
    }),
    goalsDate: row.goalsDate ?? null,
    achievements: row.achievements ?? [],
    inactiveDays: row.inactiveDays,
    winbackLevel: row.winbackLevel,
  };
}

async function ensureRow(userId: string): Promise<UserRetention> {
  const [existing] = await db
    .select()
    .from(userRetentionTable)
    .where(eq(userRetentionTable.userId, userId))
    .limit(1);
  if (existing) return existing;

  const [inserted] = await db
    .insert(userRetentionTable)
    .values({ userId })
    .onConflictDoNothing()
    .returning();

  if (inserted) return inserted;

  const [row] = await db
    .select()
    .from(userRetentionTable)
    .where(eq(userRetentionTable.userId, userId))
    .limit(1);
  return row!;
}

async function persist(userId: string, state: RetentionState, extra?: Partial<UserRetention>) {
  const [row] = await db
    .update(userRetentionTable)
    .set({
      currentStreak: state.currentStreak,
      longestStreak: state.longestStreak,
      lastActiveDate: state.lastActiveDate,
      lastCheckinDate: state.lastCheckinDate,
      shieldUsedMonth: state.shieldUsedMonth,
      totalStars: state.totalStars,
      totalCoins: state.totalCoins,
      parentXp: state.parentXp,
      dailyGoals: state.dailyGoals,
      goalsDate: state.goalsDate,
      achievements: state.achievements,
      inactiveDays: state.inactiveDays,
      winbackLevel: state.winbackLevel,
      updatedAt: new Date(),
      ...extra,
    })
    .where(eq(userRetentionTable.userId, userId))
    .returning();
  return row!;
}

export type RetentionStatusPayload = {
  state: RetentionState;
  shieldAvailable: boolean;
  canUseShield: boolean;
  parentingScore: number;
  goalsComplete: number;
  goalsTotal: number;
  checkedInToday: boolean;
  resumeItems: RetentionResumeItem[];
  preferences: RetentionPreferences;
  weeklySummary: WeeklySummaryCache | null;
  trialPremiumFeature: string | null;
};

const TRIAL_FEATURES = [
  "hub_phonics",
  "hub_story_hub",
  "speech_coach",
  "hub_smart_study",
  "hub_nutrition",
  "audio_lessons",
  "amy_coach",
] as const;

function trialFeatureForDay(now = new Date()): string {
  const day = now.getDay();
  return TRIAL_FEATURES[day % TRIAL_FEATURES.length] ?? "hub_phonics";
}

export async function getRetentionStatus(
  userId: string,
  opts?: { routineCompletionPct?: number; isTrialing?: boolean },
): Promise<RetentionStatusPayload> {
  const row = await ensureRow(userId);
  const state = toState(row);
  const goals = state.dailyGoals;
  const goalsComplete = Object.values(goals).filter(Boolean).length;
  const today = todayIso();

  return {
    state,
    shieldAvailable: shieldAvailable(state.shieldUsedMonth),
    canUseShield: canUseStreakShield(state),
    parentingScore: computeParentingScore({
      streak: state.currentStreak,
      goalsComplete,
      goalsTotal: 4,
      routineCompletionPct: opts?.routineCompletionPct,
    }),
    goalsComplete,
    goalsTotal: 4,
    checkedInToday: state.lastCheckinDate === today,
    resumeItems: row.resumeItems ?? [],
    preferences: row.preferences ?? {},
    weeklySummary: row.weeklySummaryCache ?? null,
    trialPremiumFeature: opts?.isTrialing ? trialFeatureForDay() : null,
  };
}

export async function performDailyCheckin(
  userId: string,
  opts?: { useShield?: boolean },
) {
  const row = await ensureRow(userId);
  const result = recordDailyCheckin(toState(row), opts);
  if (result.alreadyCheckedIn) {
    return { ...result, row };
  }
  const updated = await persist(userId, result.next);
  return { ...result, row: updated };
}

export async function markDailyGoal(userId: string, goal: GoalKey) {
  const row = await ensureRow(userId);
  const result = completeDailyGoal(toState(row), goal);
  const updated = await persist(userId, result.next);
  return { ...result, row: updated };
}

export async function saveResumeItem(userId: string, item: RetentionResumeItem) {
  const row = await ensureRow(userId);
  const items = [...(row.resumeItems ?? []).filter((i: RetentionResumeItem) => i.type !== item.type), item]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);
  const [updated] = await db
    .update(userRetentionTable)
    .set({ resumeItems: items, updatedAt: new Date() })
    .where(eq(userRetentionTable.userId, userId))
    .returning();
  return updated!;
}

export async function updatePreferences(
  userId: string,
  patch: Partial<RetentionPreferences>,
) {
  const row = await ensureRow(userId);
  const preferences = { ...(row.preferences ?? {}), ...patch };
  const [updated] = await db
    .update(userRetentionTable)
    .set({ preferences, updatedAt: new Date() })
    .where(eq(userRetentionTable.userId, userId))
    .returning();
  return updated!;
}

export async function touchInactive(userId: string) {
  const row = await ensureRow(userId);
  const today = todayIso();
  if (row.lastActiveDate === today) return row;
  const inactiveDays = row.lastActiveDate
    ? Math.max(
        0,
        Math.round(
          (Date.parse(`${today}T00:00:00`) -
            Date.parse(`${row.lastActiveDate}T00:00:00`)) /
            86400000,
        ) - 1,
      )
    : 0;
  const winbackLevel = computeWinbackLevel(inactiveDays);
  const [updated] = await db
    .update(userRetentionTable)
    .set({ inactiveDays, winbackLevel, updatedAt: new Date() })
    .where(eq(userRetentionTable.userId, userId))
    .returning();
  return updated!;
}

export async function buildWeeklySummary(
  userId: string,
  stats: Omit<WeeklySummaryCache, "weekKey" | "generatedAt">,
): Promise<WeeklySummaryCache> {
  const now = new Date();
  const d = new Date(now);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  const weekKey = `${d.getFullYear()}-W${week}`;
  const cache: WeeklySummaryCache = {
    weekKey,
    generatedAt: now.toISOString(),
    ...stats,
  };
  await db
    .update(userRetentionTable)
    .set({ weeklySummaryCache: cache, updatedAt: now })
    .where(eq(userRetentionTable.userId, userId));
  return cache;
}

export async function listWinbackCandidates(minInactiveDays: number, limit = 50) {
  return db
    .select({
      userId: userRetentionTable.userId,
      inactiveDays: userRetentionTable.inactiveDays,
      winbackLevel: userRetentionTable.winbackLevel,
    })
    .from(userRetentionTable)
    .where(gte(userRetentionTable.inactiveDays, minInactiveDays))
    .limit(limit);
}
