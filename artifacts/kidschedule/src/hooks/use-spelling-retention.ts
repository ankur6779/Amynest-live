import { useCallback, useMemo, useState } from "react";
import {
  getSpellingManifest,
  catalogEntryToWord,
  type SpellingAgeGroup,
  type SpellingDifficulty,
  type SpellingWord,
} from "@workspace/spelling-catalog";

const DAILY_GOAL_TARGET = 5;
const DAILY_GOAL_STARS = 10;
const STORAGE_PREFIX = "amynest:spelling:retention:";

export const RETENTION_ACHIEVEMENTS = {
  first_word: { label: "First Word", emoji: "🌱", desc: "Learn your first word" },
  words_10: { label: "10 Words", emoji: "📚", desc: "Master 10 words" },
  words_50: { label: "50 Words", emoji: "🎯", desc: "Master 50 words" },
  words_100: { label: "100 Words", emoji: "💯", desc: "Master 100 words" },
  perfect_session: { label: "Perfect Session", emoji: "✨", desc: "Complete a session with no mistakes" },
  streak_7: { label: "7 Day Streak", emoji: "🔥", desc: "Practice 7 days in a row" },
  competition_winner: { label: "Competition Winner", emoji: "🏆", desc: "Win a spelling competition" },
} as const;

export type RetentionAchievementId = keyof typeof RETENTION_ACHIEVEMENTS;

export const STREAK_MILESTONES = [3, 7, 14, 30] as const;

export const LEVEL_UNLOCKS: Record<number, string> = {
  3: "Practice Mode",
  5: "Competition Mode",
  7: "Battle Mode",
  10: "Tournament Mode",
};

export interface WordCollectionEntry {
  id: string;
  word: string;
  updatedAt: string;
}

export interface SpellingRetentionState {
  dailyDate: string;
  dailyWords: number;
  dailyGoalDone: boolean;
  bonusStars: number;
  streak: number;
  lastActiveDate: string | null;
  streakMilestones: number[];
  collection: {
    learning: WordCollectionEntry[];
    practicing: WordCollectionEntry[];
    mastered: WordCollectionEntry[];
  };
  achievements: Record<string, string>;
  phonicsMisses: Record<string, number>;
  phonicsHits: Record<string, number>;
  weekly: Array<{
    date: string;
    words: number;
    stars: number;
    correct: number;
    attempts: number;
  }>;
  lastLevelSeen: number;
  competitionWins: number;
}

export interface RetentionCelebration {
  id: string;
  type: "daily_goal" | "badge" | "level_up" | "streak_milestone" | "word_mastered";
  title: string;
  subtitle?: string;
}

/** Full-screen overlay only for meaningful milestones — not per-word flashes. */
export const OVERLAY_CELEBRATION_TYPES = new Set<RetentionCelebration["type"]>([
  "daily_goal",
  "level_up",
  "streak_milestone",
  "badge",
]);

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function storageKey(childId: number): string {
  return `${STORAGE_PREFIX}${childId}`;
}

function emptyState(): SpellingRetentionState {
  return {
    dailyDate: todayKey(),
    dailyWords: 0,
    dailyGoalDone: false,
    bonusStars: 0,
    streak: 0,
    lastActiveDate: null,
    streakMilestones: [],
    collection: { learning: [], practicing: [], mastered: [] },
    achievements: {},
    phonicsMisses: {},
    phonicsHits: {},
    weekly: [],
    lastLevelSeen: 1,
    competitionWins: 0,
  };
}

const memoryRetention = new Map<number, SpellingRetentionState>();

export function loadRetentionState(childId: number): SpellingRetentionState {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(storageKey(childId));
      if (raw) {
        const parsed = { ...emptyState(), ...JSON.parse(raw) } as SpellingRetentionState;
        memoryRetention.set(childId, parsed);
        return parsed;
      }
    } catch {
      /* fall through */
    }
  }
  return memoryRetention.get(childId) ?? emptyState();
}

function saveRetentionState(childId: number, state: SpellingRetentionState): void {
  memoryRetention.set(childId, state);
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKey(childId), JSON.stringify(state));
  } catch {
    /* quota */
  }
}

function upsertCollection(
  list: WordCollectionEntry[],
  entry: WordCollectionEntry,
  max = 200,
): WordCollectionEntry[] {
  const filtered = list.filter((e) => e.id !== entry.id);
  return [entry, ...filtered].slice(0, max);
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T12:00:00").getTime();
  const db = new Date(b + "T12:00:00").getTime();
  return Math.round((db - da) / 86_400_000);
}

function rollDaily(state: SpellingRetentionState): SpellingRetentionState {
  const today = todayKey();
  if (state.dailyDate === today) return state;
  return {
    ...state,
    dailyDate: today,
    dailyWords: 0,
    dailyGoalDone: false,
  };
}

function touchStreak(state: SpellingRetentionState): {
  state: SpellingRetentionState;
  celebrations: RetentionCelebration[];
} {
  const today = todayKey();
  const celebrations: RetentionCelebration[] = [];
  let streak = state.streak;
  const last = state.lastActiveDate;

  if (last === today) {
    return { state, celebrations };
  }

  if (!last) {
    streak = 1;
  } else {
    const gap = dayDiff(last, today);
    streak = gap === 1 ? state.streak + 1 : 1;
  }

  const milestones = [...state.streakMilestones];
  for (const m of STREAK_MILESTONES) {
    if (streak >= m && !milestones.includes(m)) {
      milestones.push(m);
      celebrations.push({
        id: `streak-${m}-${today}`,
        type: "streak_milestone",
        title: `${m} Day Streak! 🔥`,
        subtitle: `You kept going for ${m} days`,
      });
    }
  }

  return {
    state: { ...state, streak, lastActiveDate: today, streakMilestones: milestones },
    celebrations,
  };
}

function bumpWeekly(
  weekly: SpellingRetentionState["weekly"],
  patch: Partial<{ words: number; stars: number; correct: number; attempts: number }>,
): SpellingRetentionState["weekly"] {
  const today = todayKey();
  const rest = weekly.filter((w) => w.date !== today);
  const existing = weekly.find((w) => w.date === today) ?? {
    date: today,
    words: 0,
    stars: 0,
    correct: 0,
    attempts: 0,
  };
  return [
    {
      date: today,
      words: existing.words + (patch.words ?? 0),
      stars: existing.stars + (patch.stars ?? 0),
      correct: existing.correct + (patch.correct ?? 0),
      attempts: existing.attempts + (patch.attempts ?? 0),
    },
    ...rest,
  ].slice(0, 14);
}

function unlockAchievement(
  state: SpellingRetentionState,
  id: RetentionAchievementId,
  celebrations: RetentionCelebration[],
): SpellingRetentionState {
  if (state.achievements[id]) return state;
  celebrations.push({
    id: `badge-${id}-${Date.now()}`,
    type: "badge",
    title: "Badge Unlocked!",
    subtitle: RETENTION_ACHIEVEMENTS[id].label,
  });
  return {
    ...state,
    achievements: { ...state.achievements, [id]: new Date().toISOString() },
  };
}

function checkCollectionAchievements(
  state: SpellingRetentionState,
  celebrations: RetentionCelebration[],
): SpellingRetentionState {
  const n = state.collection.mastered.length;
  let s = state;
  if (n >= 1) s = unlockAchievement(s, "first_word", celebrations);
  if (n >= 10) s = unlockAchievement(s, "words_10", celebrations);
  if (n >= 50) s = unlockAchievement(s, "words_50", celebrations);
  if (n >= 100) s = unlockAchievement(s, "words_100", celebrations);
  if (s.streak >= 7) s = unlockAchievement(s, "streak_7", celebrations);
  return s;
}

export function getRecommendedWords(
  ageGroup: SpellingAgeGroup,
  difficulty: SpellingDifficulty,
  weakSound: string,
  limit = 4,
): SpellingWord[] {
  const key = `${ageGroup}:${difficulty}` as `${SpellingAgeGroup}:${SpellingDifficulty}`;
  const bucket = getSpellingManifest().buckets[key] ?? [];
  return bucket
    .filter((e) => e.sounds.some((s) => s.toLowerCase() === weakSound.toLowerCase()) || e.word.includes(weakSound))
    .slice(0, limit)
    .map(catalogEntryToWord);
}

export function getWeakestSound(state: SpellingRetentionState): string | null {
  let best: { sound: string; misses: number } | null = null;
  for (const [sound, misses] of Object.entries(state.phonicsMisses)) {
    if (!best || misses > best.misses) best = { sound, misses };
  }
  return best && best.misses > 0 ? best.sound : null;
}

export function getStrongestSound(state: SpellingRetentionState): string | null {
  let best: { sound: string; hits: number } | null = null;
  for (const [sound, hits] of Object.entries(state.phonicsHits)) {
    if (!best || hits > best.hits) best = { sound, hits };
  }
  return best && best.hits > 0 ? best.sound : null;
}

export function buildWeeklyReport(state: SpellingRetentionState) {
  const week = state.weekly.slice(0, 7);
  const wordsLearned = week.reduce((a, d) => a + d.words, 0);
  const starsEarned = week.reduce((a, d) => a + d.stars, 0) + (state.dailyGoalDone ? DAILY_GOAL_STARS : 0);
  const attempts = week.reduce((a, d) => a + d.attempts, 0);
  const correct = week.reduce((a, d) => a + d.correct, 0);
  const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
  return {
    wordsLearned,
    starsEarned,
    accuracy,
    strongSound: getStrongestSound(state),
    weakSound: getWeakestSound(state),
    daysActive: week.filter((d) => d.words > 0 || d.attempts > 0).length,
  };
}

export function useSpellingRetention(childId: number) {
  const [state, setState] = useState<SpellingRetentionState>(() => loadRetentionState(childId));
  const [celebrations, setCelebrations] = useState<RetentionCelebration[]>([]);

  const mutate = useCallback(
    (
      fn: (s: SpellingRetentionState) => {
        state: SpellingRetentionState;
        celebrations?: RetentionCelebration[];
      },
    ) => {
      setState((prev) => {
        const rolled = rollDaily(prev);
        const { state: next, celebrations = [] } = fn(rolled);
        saveRetentionState(childId, next);
        const overlay = celebrations.filter((c) => OVERLAY_CELEBRATION_TYPES.has(c.type));
        if (overlay.length > 0) {
          setCelebrations((c) => [...overlay, ...c].slice(0, 5));
        }
        return next;
      });
    },
    [childId],
  );

  const dismissCelebration = useCallback((id: string) => {
    setCelebrations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const recordWordLearned = useCallback(
    (word: SpellingWord) => {
      mutate((s) => {
        const now = new Date().toISOString();
        const entry = { id: word.id, word: word.word, updatedAt: now };
        return {
          state: {
            ...s,
            collection: {
              ...s.collection,
              learning: upsertCollection(s.collection.learning, entry),
            },
          },
        };
      });
    },
    [mutate],
  );

  const recordWordPracticed = useCallback(
    (word: SpellingWord, correct: boolean) => {
      mutate((s) => {
        const now = new Date().toISOString();
        const entry = { id: word.id, word: word.word, updatedAt: now };
        let next = { ...s };

        for (const sound of word.chunks.filter((c) => c.length >= 2)) {
          const k = sound.toLowerCase();
          if (correct) {
            next.phonicsHits = { ...next.phonicsHits, [k]: (next.phonicsHits[k] ?? 0) + 1 };
          } else {
            next.phonicsMisses = { ...next.phonicsMisses, [k]: (next.phonicsMisses[k] ?? 0) + 1 };
          }
        }

        if (correct) {
          next.collection = {
            learning: next.collection.learning.filter((e) => e.id !== word.id),
            practicing: upsertCollection(next.collection.practicing, entry),
            mastered: next.collection.mastered,
          };
        } else {
          next.collection = {
            ...next.collection,
            practicing: upsertCollection(next.collection.practicing, entry),
          };
        }

        next.weekly = bumpWeekly(next.weekly, { attempts: 1, correct: correct ? 1 : 0 });
        return { state: next };
      });
    },
    [mutate],
  );

  const recordWordMastered = useCallback(
    (word: SpellingWord) => {
      mutate((s) => {
        const now = new Date().toISOString();
        const entry = { id: word.id, word: word.word, updatedAt: now };
        return {
          state: {
            ...s,
            collection: {
              learning: s.collection.learning.filter((e) => e.id !== word.id),
              practicing: s.collection.practicing.filter((e) => e.id !== word.id),
              mastered: upsertCollection(s.collection.mastered, entry),
            },
          },
        };
      });
    },
    [mutate],
  );

  const recordSessionComplete = useCallback(
    (words: SpellingWord[], opts?: { perfect?: boolean }) => {
      mutate((s) => {
        const celebrations: RetentionCelebration[] = [];
        const { state: afterStreak, celebrations: streakCeleb } = touchStreak(s);
        let next = afterStreak;
        celebrations.push(...streakCeleb);

        const count = words.length;
        next.dailyWords = Math.min(DAILY_GOAL_TARGET, next.dailyWords + count);
        next.weekly = bumpWeekly(next.weekly, { words: count, stars: count * 2 });

        for (const w of words) {
          const entry = { id: w.id, word: w.word, updatedAt: new Date().toISOString() };
          next.collection = {
            ...next.collection,
            learning: next.collection.learning.filter((e) => e.id !== w.id),
            practicing: upsertCollection(next.collection.practicing, entry),
            mastered: next.collection.mastered,
          };
        }

        if (!next.dailyGoalDone && next.dailyWords >= DAILY_GOAL_TARGET) {
          next.dailyGoalDone = true;
          next.bonusStars += DAILY_GOAL_STARS;
          next.weekly = bumpWeekly(next.weekly, { stars: DAILY_GOAL_STARS });
          celebrations.push({
            id: `daily-${todayKey()}`,
            type: "daily_goal",
            title: "Daily Goal Complete! 🎉",
            subtitle: `+${DAILY_GOAL_STARS} stars earned`,
          });
        }

        if (opts?.perfect) {
          next = unlockAchievement(next, "perfect_session", celebrations);
        }

        next = checkCollectionAchievements(next, celebrations);
        return { state: next, celebrations };
      });
    },
    [mutate],
  );

  const recordCompetitionWin = useCallback(() => {
    mutate((s) => {
      const celebrations: RetentionCelebration[] = [];
      let next = { ...s, competitionWins: s.competitionWins + 1 };
      next = unlockAchievement(next, "competition_winner", celebrations);
      const { state: afterStreak, celebrations: streakCeleb } = touchStreak(next);
      celebrations.push(...streakCeleb);
      return { state: afterStreak, celebrations };
    });
  }, [mutate]);

  const checkLevelUp = useCallback(
    (currentLevel: number) => {
      setState((prev) => {
        const rolled = rollDaily(prev);
        if (currentLevel <= rolled.lastLevelSeen) return rolled;
        const unlock = LEVEL_UNLOCKS[currentLevel];
        const celebrations: RetentionCelebration[] = [{
          id: `level-${currentLevel}`,
          type: "level_up",
          title: "LEVEL UP 🎉",
          subtitle: unlock ? `Level ${currentLevel} — Unlocked: ${unlock}` : `Level ${currentLevel} Reached`,
        }];
        const next = { ...rolled, lastLevelSeen: currentLevel };
        saveRetentionState(childId, next);
        setCelebrations((c) => [...celebrations, ...c].slice(0, 5));
        return next;
      });
    },
    [childId],
  );

  const syncLevelBaseline = useCallback(
    (currentLevel: number) => {
      mutate((s) => {
        if (s.lastLevelSeen >= currentLevel) return { state: s };
        return { state: { ...s, lastLevelSeen: currentLevel } };
      });
    },
    [mutate],
  );

  const daily = useMemo(() => {
    const rolled = rollDaily(state);
    return {
      current: rolled.dailyWords,
      target: DAILY_GOAL_TARGET,
      done: rolled.dailyGoalDone,
      reward: DAILY_GOAL_STARS,
      progressPct: Math.min(100, Math.round((rolled.dailyWords / DAILY_GOAL_TARGET) * 100)),
    };
  }, [state]);

  const streakAtRisk = useMemo(() => {
    const today = todayKey();
    if (state.lastActiveDate === today) return false;
    if (!state.lastActiveDate || state.streak === 0) return false;
    return dayDiff(state.lastActiveDate, today) === 1;
  }, [state.lastActiveDate, state.streak]);

  const weeklyReport = useMemo(() => buildWeeklyReport(state), [state]);

  const collectionCounts = useMemo(
    () => ({
      learning: state.collection.learning.length,
      practicing: state.collection.practicing.length,
      mastered: state.collection.mastered.length,
      total:
        state.collection.learning.length +
        state.collection.practicing.length +
        state.collection.mastered.length,
    }),
    [state.collection],
  );

  return {
    state,
    daily,
    streak: state.streak,
    streakAtRisk,
    bonusStars: state.bonusStars,
    collectionCounts,
    collection: state.collection,
    achievements: state.achievements,
    celebrations,
    dismissCelebration,
    weeklyReport,
    recordWordLearned,
    recordWordPracticed,
    recordWordMastered,
    recordSessionComplete,
    recordCompetitionWin,
    checkLevelUp,
    syncLevelBaseline,
    getWeakestSound: () => getWeakestSound(state),
  };
}

export { DAILY_GOAL_TARGET, DAILY_GOAL_STARS };
