import { DAILY_QUESTS, getLevelForXp, HEALTH_LEVELS, PRESTIGE_XP_PER_LEVEL } from "./constants";
import { aggregateWellnessFromHistory } from "./scoring";
import { weekKey } from "./retention";
import type {
  BadgeId,
  DailyQuestState,
  GameSessionResult,
  HealthLabPersistedState,
  QuestId,
  QuestProgress,
} from "./types";

const LS_PREFIX = "amynest_health_lab_v2";

/** Local timezone date key (YYYY-MM-DD). */
export function dateKeyLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** @deprecated use dateKeyLocal */
export function dateKey(d = new Date()): string {
  return dateKeyLocal(d);
}

function defaultQuests(): QuestProgress[] {
  return DAILY_QUESTS.map((q) => ({
    id: q.id,
    progress: 0,
    target: q.target,
  }));
}

export function defaultHealthLabState(childId: number): HealthLabPersistedState {
  return {
    version: 2,
    childId,
    totalXp: 0,
    coins: 0,
    level: 1,
    prestige: 0,
    streakDays: 0,
    questStreakDays: 0,
    lastPlayDateKey: null,
    lastQuestCompleteDateKey: null,
    streakMilestonesCelebrated: [],
    badges: [],
    avatarId: "explorer",
    unlockedAvatarItems: [],
    equippedItems: {},
    gameHistory: [],
    personalBests: {},
    dailyQuests: null,
    wellnessScores: {
      focus: 0,
      calmness: 0,
      balance: 0,
      coordination: 0,
      consistency: 0,
      overall: 0,
    },
    gamesCompletedToday: [],
    totalSessions: 0,
    calmnessRewardedToday: false,
    calmnessSnapshotsToday: 0,
    dailySurpriseClaimedDateKey: null,
    treasureChestOpenedThisWeek: null,
    sessionBurstStartMs: null,
    sessionBurstCount: 0,
    avatarEvolutionHistory: [],
    weeklyChallengeProgress: 0,
    weeklyChallengeWeekKey: null,
    weeklyChallengeCompletedWeekKey: null,
    monthlyMegaQuestClaimedMonthKey: null,
  };
}

function migrateV1(parsed: Record<string, unknown>, childId: number): HealthLabPersistedState {
  const base = defaultHealthLabState(childId);
  return normalize(childId, {
    ...base,
    ...parsed,
    version: 2,
    childId,
    prestige: 0,
    questStreakDays: 0,
    lastQuestCompleteDateKey: null,
    equippedItems: {},
    calmnessRewardedToday: false,
    calmnessSnapshotsToday: 0,
    dailySurpriseClaimedDateKey: null,
    treasureChestOpenedThisWeek: null,
    sessionBurstStartMs: null,
    sessionBurstCount: 0,
    avatarEvolutionHistory: [],
    weeklyChallengeProgress: 0,
    weeklyChallengeWeekKey: null,
  } as Partial<HealthLabPersistedState>);
}

function normalize(childId: number, parsed: Partial<HealthLabPersistedState>): HealthLabPersistedState {
  const base = defaultHealthLabState(childId);
  const merged: HealthLabPersistedState = {
    ...base,
    ...parsed,
    version: 2,
    childId,
    badges: parsed.badges ?? [],
    gameHistory: parsed.gameHistory ?? [],
    personalBests: parsed.personalBests ?? {},
    wellnessScores: { ...base.wellnessScores, ...parsed.wellnessScores },
    gamesCompletedToday: parsed.gamesCompletedToday ?? [],
    unlockedAvatarItems: parsed.unlockedAvatarItems ?? [],
    equippedItems: (parsed.equippedItems as HealthLabPersistedState["equippedItems"]) ?? {},
    streakMilestonesCelebrated: parsed.streakMilestonesCelebrated ?? [],
    avatarEvolutionHistory: parsed.avatarEvolutionHistory ?? [],
    prestige: parsed.prestige ?? 0,
    questStreakDays: parsed.questStreakDays ?? 0,
    calmnessRewardedToday: parsed.calmnessRewardedToday ?? false,
    calmnessSnapshotsToday: parsed.calmnessSnapshotsToday ?? 0,
    dailySurpriseClaimedDateKey: parsed.dailySurpriseClaimedDateKey ?? null,
    treasureChestOpenedThisWeek: parsed.treasureChestOpenedThisWeek ?? null,
    sessionBurstStartMs: parsed.sessionBurstStartMs ?? null,
    sessionBurstCount: parsed.sessionBurstCount ?? 0,
    weeklyChallengeProgress: parsed.weeklyChallengeProgress ?? 0,
    weeklyChallengeWeekKey: parsed.weeklyChallengeWeekKey ?? null,
    weeklyChallengeCompletedWeekKey: parsed.weeklyChallengeCompletedWeekKey ?? null,
    monthlyMegaQuestClaimedMonthKey: parsed.monthlyMegaQuestClaimedMonthKey ?? null,
  };
  const level = getLevelForXp(merged.totalXp, merged.prestige);
  merged.level = level.id;
  merged.avatarId = level.avatarId;
  return merged;
}

export function loadHealthLabState(childId: number): HealthLabPersistedState {
  try {
    const v2 = localStorage.getItem(`${LS_PREFIX}_${childId}`);
    if (v2) return normalize(childId, JSON.parse(v2) as Partial<HealthLabPersistedState>);
    const v1 = localStorage.getItem(`amynest_health_lab_v1_${childId}`);
    if (v1) {
      const migrated = migrateV1(JSON.parse(v1) as Record<string, unknown>, childId);
      saveHealthLabState(migrated);
      return migrated;
    }
    return defaultHealthLabState(childId);
  } catch {
    return defaultHealthLabState(childId);
  }
}

export function saveHealthLabState(state: HealthLabPersistedState): void {
  try {
    localStorage.setItem(`${LS_PREFIX}_${state.childId}`, JSON.stringify(state));
  } catch {
    /* quota or private mode */
  }
}

export function ensureDailyQuests(state: HealthLabPersistedState): HealthLabPersistedState {
  const today = dateKeyLocal();
  if (state.dailyQuests?.dateKey === today) return state;
  return {
    ...state,
    dailyQuests: {
      dateKey: today,
      quests: defaultQuests(),
      allCompleted: false,
    },
    gamesCompletedToday: today === state.lastPlayDateKey ? state.gamesCompletedToday : [],
    calmnessRewardedToday: today === state.lastPlayDateKey ? state.calmnessRewardedToday : false,
    calmnessSnapshotsToday: today === state.lastPlayDateKey ? state.calmnessSnapshotsToday : 0,
    sessionBurstStartMs: null,
    sessionBurstCount: 0,
  };
}

export function updateStreak(state: HealthLabPersistedState): HealthLabPersistedState {
  const today = dateKeyLocal();
  if (state.lastPlayDateKey === today) return state;

  const yesterday = dateKeyLocal(new Date(Date.now() - 86400000));
  let streakDays = 1;
  if (state.lastPlayDateKey === yesterday) {
    streakDays = state.streakDays + 1;
  }

  return {
    ...state,
    streakDays,
    lastPlayDateKey: today,
  };
}

export function hasBadge(state: HealthLabPersistedState, id: BadgeId): boolean {
  return state.badges.some((b) => b.id === id);
}

export function unlockBadge(state: HealthLabPersistedState, id: BadgeId): HealthLabPersistedState {
  if (hasBadge(state, id)) return state;
  return {
    ...state,
    badges: [...state.badges, { id, unlockedAt: Date.now() }],
  };
}

export function trackSessionBurst(
  state: HealthLabPersistedState,
  durationMs: number,
): HealthLabPersistedState {
  const now = Date.now();
  const burstWindow = 5 * 60 * 1000;
  let start = state.sessionBurstStartMs;
  let count = state.sessionBurstCount;

  if (!start || now - start > burstWindow) {
    start = now - durationMs;
    count = 1;
  } else {
    count += 1;
  }

  return { ...state, sessionBurstStartMs: start, sessionBurstCount: count };
}

export function appendSessionResult(
  state: HealthLabPersistedState,
  result: GameSessionResult,
): HealthLabPersistedState {
  let next = ensureDailyQuests(state);
  next = updateStreak(next);
  next = trackSessionBurst(next, result.durationMs);

  const history = [...next.gameHistory, result].slice(-500);
  const totalXp = next.totalXp + result.xpEarned;
  const level = getLevelForXp(totalXp, next.prestige);

  const gamesCompletedToday = next.gamesCompletedToday.includes(result.gameId)
    ? next.gamesCompletedToday
    : [...next.gamesCompletedToday, result.gameId];

  const pb = next.personalBests[result.gameId] ?? 0;
  const personalBests =
    result.score > pb
      ? { ...next.personalBests, [result.gameId]: result.score }
      : next.personalBests;

  let avatarEvolutionHistory = next.avatarEvolutionHistory;
  if (level.id > next.level) {
    avatarEvolutionHistory = [
      ...avatarEvolutionHistory,
      { level: level.id, avatarId: level.avatarId, timestamp: Date.now() },
    ].slice(-20);
  }

  const wk = weekKey();
  let weeklyChallengeProgress = next.weeklyChallengeProgress;
  let weeklyChallengeWeekKey = next.weeklyChallengeWeekKey;
  if (weeklyChallengeWeekKey !== wk) {
    weeklyChallengeWeekKey = wk;
    weeklyChallengeProgress = 0;
  }
  weeklyChallengeProgress += 1;

  const maxXp = HEALTH_LEVELS[HEALTH_LEVELS.length - 1].xpRequired;
  const prestige =
    totalXp >= maxXp
      ? 1 + Math.floor((totalXp - maxXp) / PRESTIGE_XP_PER_LEVEL)
      : next.prestige;

  next = {
    ...next,
    gameHistory: history,
    totalXp,
    prestige,
    level: level.id,
    avatarId: level.avatarId,
    coins: next.coins + Math.round(result.xpEarned / 5),
    personalBests,
    wellnessScores: aggregateWellnessFromHistory(history),
    gamesCompletedToday,
    totalSessions: next.totalSessions + 1,
    avatarEvolutionHistory,
    weeklyChallengeProgress,
    weeklyChallengeWeekKey,
  };

  if (result.gameId === "calmness-meter") {
    next = {
      ...next,
      calmnessSnapshotsToday: next.calmnessSnapshotsToday + 1,
      calmnessRewardedToday: result.xpEarned > 0 ? true : next.calmnessRewardedToday,
    };
  }

  return next;
}

export function incrementQuestProgress(
  state: HealthLabPersistedState,
  questId: QuestProgress["id"],
  amount = 1,
): { state: HealthLabPersistedState; newlyCompleted: QuestId[] } {
  const next = ensureDailyQuests(state);
  if (!next.dailyQuests) return { state: next, newlyCompleted: [] };

  const newlyCompleted: QuestId[] = [];
  const quests = next.dailyQuests.quests.map((q) => {
    if (q.id !== questId || q.completedAt) return q;
    const progress = Math.min(q.target, q.progress + amount);
    const completed = progress >= q.target;
    if (completed) newlyCompleted.push(questId);
    return {
      ...q,
      progress,
      completedAt: completed ? Date.now() : undefined,
    };
  });

  const allCompleted = quests.every((q) => q.completedAt != null);

  let coins = next.coins;
  let totalXp = next.totalXp;
  for (const q of quests) {
    const def = DAILY_QUESTS.find((d) => d.id === q.id);
    const wasDone = state.dailyQuests?.quests.find((old) => old.id === q.id)?.completedAt;
    if (q.completedAt && def && !wasDone) {
      coins += def.coinReward;
      totalXp += def.xpReward;
    }
  }

  let questStreakDays = next.questStreakDays;
  let lastQuestCompleteDateKey = next.lastQuestCompleteDateKey;
  if (newlyCompleted.length > 0) {
    const today = dateKeyLocal();
    const yesterday = dateKeyLocal(new Date(Date.now() - 86400000));
    if (lastQuestCompleteDateKey === yesterday) questStreakDays += 1;
    else if (lastQuestCompleteDateKey !== today) questStreakDays = 1;
    lastQuestCompleteDateKey = today;
  }

  const level = getLevelForXp(totalXp, next.prestige);

  return {
    state: {
      ...next,
      coins,
      totalXp,
      level: level.id,
      avatarId: level.avatarId,
      questStreakDays,
      lastQuestCompleteDateKey,
      dailyQuests: { ...next.dailyQuests, quests, allCompleted },
    },
    newlyCompleted,
  };
}

export function filterHistoryByRange(
  history: GameSessionResult[],
  range: "today" | "7d" | "30d" | "90d" | "lifetime",
): GameSessionResult[] {
  if (range === "lifetime") return history;
  const now = Date.now();
  const ms =
    range === "today"
      ? 86400000
      : range === "7d"
        ? 7 * 86400000
        : range === "30d"
          ? 30 * 86400000
          : 90 * 86400000;
  const cutoff = range === "today" ? dateKeyLocal() : null;
  return history.filter((s) => {
    if (cutoff) return dateKeyLocal(new Date(s.timestamp)) === cutoff;
    return s.timestamp >= now - ms;
  });
}

export function sessionDateKey(timestamp: number): string {
  return dateKeyLocal(new Date(timestamp));
}
