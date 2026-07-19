import type {
  AchievementV2Id,
  AdaptiveSessionStats,
  CollectionState,
  DailyMission,
  LearningDna,
  MasteryState,
  MicroGameId,
  ReviewSchedule,
} from "@workspace/abacus";
import {
  buildDailyMission,
  buildLearningDna,
  emptyAdaptiveStats,
  emptyCollectionState,
  emptyMasteryState,
  emptyReviewSchedule,
  evaluateAchievementsV2,
} from "@workspace/abacus";

export const DAILY_PRACTICE_GOAL = 5;
export const WARMUP_BONUS_POINTS = 30;

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayDateKey(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const PROGRESS_LS_KEY = (childId: number) => `abacus.progress.v1.${childId}`;
const DAILY_PRACTICE_LS_KEY = (childId: number) => `abacus.daily.v1.${childId}`;
const STREAK_LS_KEY = (childId: number) => `abacus.streak.v1.${childId}`;
const AGE_OVERRIDE_LS_KEY = (childId: number) => `abacus.ageOverride.v1.${childId}`;
const LEARN_COMPLETE_LS_KEY = (childId: number) => `abacus.learnComplete.v1.${childId}`;
const WARMUP_LS_KEY = (childId: number) => `abacus.warmup.v1.${childId}`;
const LAST_ACTIVE_LS_KEY = (childId: number) => `abacus.lastActive.v1.${childId}`;
const OFFLINE_QUEUE_LS_KEY = (childId: number) => `abacus.offlineQueue.v1.${childId}`;

export function readCachedProgress<T = unknown>(childId: number): T | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(PROGRESS_LS_KEY(childId));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeCachedProgress(childId: number, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(PROGRESS_LS_KEY(childId), JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export interface DailyPracticeShape {
  date: string;
  correct: number;
  attempts: number;
}

export function readDailyPractice(childId: number): DailyPracticeShape {
  const empty = { date: todayDateKey(), correct: 0, attempts: 0 };
  try {
    if (typeof window === "undefined") return empty;
    const raw = window.localStorage.getItem(DAILY_PRACTICE_LS_KEY(childId));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as DailyPracticeShape;
    if (parsed.date !== todayDateKey()) return empty;
    return parsed;
  } catch {
    return empty;
  }
}

export function writeDailyPractice(childId: number, value: DailyPracticeShape): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DAILY_PRACTICE_LS_KEY(childId), JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export interface StreakShape {
  lastDate: string;
  days: number;
}

export function readStreak(childId: number): StreakShape {
  const empty = { lastDate: "", days: 0 };
  try {
    if (typeof window === "undefined") return empty;
    const raw = window.localStorage.getItem(STREAK_LS_KEY(childId));
    return raw ? (JSON.parse(raw) as StreakShape) : empty;
  } catch {
    return empty;
  }
}

export function writeStreak(childId: number, value: StreakShape): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STREAK_LS_KEY(childId), JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function bumpStreak(childId: number): StreakShape {
  const today = todayDateKey();
  const prev = readStreak(childId);
  if (prev.lastDate === today) return prev;
  const days = prev.lastDate === yesterdayDateKey() ? prev.days + 1 : 1;
  const next = { lastDate: today, days };
  writeStreak(childId, next);
  markLastActive(childId);
  return next;
}

export function readAgeOverrides(childId: number): number[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(AGE_OVERRIDE_LS_KEY(childId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed) ? parsed.filter((n) => n >= 1 && n <= 7) : [];
  } catch {
    return [];
  }
}

export function writeAgeOverride(childId: number, level: number): void {
  const prev = new Set(readAgeOverrides(childId));
  prev.add(level);
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(AGE_OVERRIDE_LS_KEY(childId), JSON.stringify([...prev]));
  } catch {
    /* noop */
  }
}

export function hasCompletedFirstLearn(childId: number): boolean {
  try {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(LEARN_COMPLETE_LS_KEY(childId)) === "1";
  } catch {
    return false;
  }
}

export function markFirstLearnComplete(childId: number): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LEARN_COMPLETE_LS_KEY(childId), "1");
  } catch {
    /* noop */
  }
}

export interface WarmupShape {
  date: string;
  completed: boolean;
  bonusAwarded: boolean;
}

export function readWarmup(childId: number): WarmupShape {
  const empty = { date: todayDateKey(), completed: false, bonusAwarded: false };
  try {
    if (typeof window === "undefined") return empty;
    const raw = window.localStorage.getItem(WARMUP_LS_KEY(childId));
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as WarmupShape;
    if (parsed.date !== todayDateKey()) return empty;
    return parsed;
  } catch {
    return empty;
  }
}

export function writeWarmup(childId: number, value: WarmupShape): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WARMUP_LS_KEY(childId), JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function markLastActive(childId: number): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_ACTIVE_LS_KEY(childId), todayDateKey());
  } catch {
    /* noop */
  }
}

export function readLastActive(childId: number): string {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(LAST_ACTIVE_LS_KEY(childId)) ?? "";
  } catch {
    return "";
  }
}

/** Days since last abacus activity (UTC date keys). */
export function daysSinceLastActive(childId: number): number {
  const last = readLastActive(childId) || readStreak(childId).lastDate;
  if (!last) return 0;
  const a = Date.parse(`${last}T00:00:00.000Z`);
  const b = Date.parse(`${todayDateKey()}T00:00:00.000Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export type OfflineQueueItem = {
  id: string;
  path: string;
  body: Record<string, unknown>;
  createdAt: string;
};

export function readOfflineQueue(childId: number): OfflineQueueItem[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(OFFLINE_QUEUE_LS_KEY(childId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OfflineQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeOfflineQueue(childId: number, items: OfflineQueueItem[]): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(OFFLINE_QUEUE_LS_KEY(childId), JSON.stringify(items.slice(-50)));
  } catch {
    /* noop */
  }
}

export function enqueueOffline(childId: number, path: string, body: Record<string, unknown>): void {
  const items = readOfflineQueue(childId);
  items.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    path,
    body,
    createdAt: new Date().toISOString(),
  });
  writeOfflineQueue(childId, items);
}

// ─── V3 enhancement layer (offline-first; never replaces V2 progress) ───

const MASTERY_LS_KEY = (childId: number) => `abacus.mastery.v3.${childId}`;
const COLLECTION_LS_KEY = (childId: number) => `abacus.collection.v3.${childId}`;
const MISSION_LS_KEY = (childId: number) => `abacus.mission.v3.${childId}`;
const ADAPTIVE_LS_KEY = (childId: number) => `abacus.adaptive.v3.${childId}`;
const MICRO_GAME_LS_KEY = (childId: number) => `abacus.microGame.v3.${childId}`;
const WEEKLY_SNAP_LS_KEY = (childId: number) => `abacus.weeklySnap.v3.${childId}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function readMastery(childId: number): MasteryState {
  const raw = readJson<MasteryState | null>(MASTERY_LS_KEY(childId), null);
  if (!raw) return emptyMasteryState();
  return { ...emptyMasteryState(), ...raw };
}

export function writeMastery(childId: number, value: MasteryState): void {
  writeJson(MASTERY_LS_KEY(childId), value);
}

export function readCollection(childId: number): CollectionState {
  return readJson(COLLECTION_LS_KEY(childId), emptyCollectionState());
}

export function writeCollection(childId: number, value: CollectionState): void {
  writeJson(COLLECTION_LS_KEY(childId), value);
}

export function readMission(childId: number, level: number): DailyMission {
  const today = todayDateKey();
  const cached = readJson<DailyMission | null>(MISSION_LS_KEY(childId), null);
  if (cached && cached.dateKey === today) return cached;
  const fresh = buildDailyMission({
    dateKey: today,
    childId,
    level: level as 1 | 2 | 3 | 4 | 5 | 6 | 7,
  });
  writeJson(MISSION_LS_KEY(childId), fresh);
  return fresh;
}

export function writeMission(childId: number, value: DailyMission): void {
  writeJson(MISSION_LS_KEY(childId), value);
}

export function readAdaptiveStats(childId: number): AdaptiveSessionStats {
  return readJson(ADAPTIVE_LS_KEY(childId), emptyAdaptiveStats());
}

export function writeAdaptiveStats(childId: number, value: AdaptiveSessionStats): void {
  writeJson(ADAPTIVE_LS_KEY(childId), value);
}

export function readPreferredMicroGame(
  childId: number,
  mode: "practice" | "mental" | "challenge",
): MicroGameId | null {
  const map = readJson<Partial<Record<string, MicroGameId>>>(MICRO_GAME_LS_KEY(childId), {});
  return map[mode] ?? null;
}

export function writePreferredMicroGame(
  childId: number,
  mode: "practice" | "mental" | "challenge",
  id: MicroGameId,
): void {
  const map = readJson<Partial<Record<string, MicroGameId>>>(MICRO_GAME_LS_KEY(childId), {});
  map[mode] = id;
  writeJson(MICRO_GAME_LS_KEY(childId), map);
}

export type WeeklySnap = {
  weekKey: string;
  accuracy: number;
  totalPoints: number;
  learningMinutes: number;
  averageScore: number;
};

export function weekKeyUtc(d = new Date()): string {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (day.getUTCDay() + 6) % 7;
  day.setUTCDate(day.getUTCDate() - dow);
  return day.toISOString().slice(0, 10);
}

export function readWeeklySnap(childId: number): WeeklySnap | null {
  return readJson<WeeklySnap | null>(WEEKLY_SNAP_LS_KEY(childId), null);
}

export function writeWeeklySnap(childId: number, value: WeeklySnap): void {
  writeJson(WEEKLY_SNAP_LS_KEY(childId), value);
}

// ─── V4 enhancement layer (additive; never replaces V1–V3 progress) ───

const DNA_LS_KEY = (childId: number) => `abacus.dna.v4.${childId}`;
const DNA_PREV_LS_KEY = (childId: number) => `abacus.dnaPrev.v4.${childId}`;
const REVIEW_LS_KEY = (childId: number) => `abacus.review.v4.${childId}`;
const EMOTION_ROTATE_LS_KEY = (childId: number) => `abacus.emotionRotate.v4.${childId}`;
const BOSSES_LS_KEY = (childId: number) => `abacus.bosses.v4.${childId}`;
const ACHIEVEMENTS_LS_KEY = (childId: number) => `abacus.achievements.v4.${childId}`;
const FAMILY_LS_KEY = (childId: number) => `abacus.family.v4.${childId}`;
const REVIEWS_DONE_LS_KEY = (childId: number) => `abacus.reviewsDone.v4.${childId}`;
const TUTOR_ASKS_V4_LS_KEY = (childId: number) => `abacus.tutorAsks.v4.${childId}`;
const WEEKEND_MISSION_LS_KEY = (childId: number) => `abacus.weekendMission.v4.${childId}`;

export function readLearningDna(childId: number): LearningDna | null {
  return readJson<LearningDna | null>(DNA_LS_KEY(childId), null);
}

export function writeLearningDna(childId: number, value: LearningDna): void {
  const prev = readLearningDna(childId);
  if (prev) writeJson(DNA_PREV_LS_KEY(childId), prev);
  writeJson(DNA_LS_KEY(childId), value);
}

export function readPreviousLearningDna(childId: number): LearningDna | null {
  return readJson<LearningDna | null>(DNA_PREV_LS_KEY(childId), null);
}

export function refreshLearningDna(
  childId: number,
  input: Parameters<typeof buildLearningDna>[0],
): LearningDna {
  const dna = buildLearningDna({
    ...input,
    previous: input.previous ?? readLearningDna(childId),
  });
  writeLearningDna(childId, dna);
  return dna;
}

export function readReviewSchedule(childId: number): ReviewSchedule {
  const raw = readJson<ReviewSchedule | null>(REVIEW_LS_KEY(childId), null);
  if (!raw) return emptyReviewSchedule();
  return { ...emptyReviewSchedule(), ...raw };
}

export function writeReviewSchedule(childId: number, value: ReviewSchedule): void {
  writeJson(REVIEW_LS_KEY(childId), value);
}

export function bumpEmotionRotate(childId: number): number {
  const n = readJson<number>(EMOTION_ROTATE_LS_KEY(childId), 0) + 1;
  writeJson(EMOTION_ROTATE_LS_KEY(childId), n);
  return n;
}

export function readEmotionRotate(childId: number): number {
  return readJson<number>(EMOTION_ROTATE_LS_KEY(childId), 0);
}

export function readBossesDefeated(childId: number): number[] {
  return readJson<number[]>(BOSSES_LS_KEY(childId), []);
}

export function markBossDefeated(childId: number, level: number): number[] {
  const prev = readBossesDefeated(childId);
  if (prev.includes(level)) return prev;
  const next = [...prev, level];
  writeJson(BOSSES_LS_KEY(childId), next);
  return next;
}

export function readAchievementsV2(childId: number): AchievementV2Id[] {
  return readJson<AchievementV2Id[]>(ACHIEVEMENTS_LS_KEY(childId), []);
}

export function syncAchievementsV2(
  childId: number,
  ctx: Parameters<typeof evaluateAchievementsV2>[0],
): { earned: AchievementV2Id[]; newlyUnlocked: AchievementV2Id[] } {
  const prev = new Set(readAchievementsV2(childId));
  const earned = evaluateAchievementsV2(ctx);
  const newlyUnlocked = earned.filter((id) => !prev.has(id));
  writeJson(ACHIEVEMENTS_LS_KEY(childId), earned);
  return { earned, newlyUnlocked };
}

export type FamilyProgressV4 = {
  dateKey: string;
  completedIds: string[];
};

export function readFamilyProgress(childId: number): FamilyProgressV4 {
  const today = todayDateKey();
  const cached = readJson<FamilyProgressV4 | null>(FAMILY_LS_KEY(childId), null);
  if (cached?.dateKey === today) return cached;
  return { dateKey: today, completedIds: [] };
}

export function markFamilyChallengeDone(childId: number, id: string): FamilyProgressV4 {
  const cur = readFamilyProgress(childId);
  if (cur.completedIds.includes(id)) return cur;
  const next = { ...cur, completedIds: [...cur.completedIds, id] };
  writeJson(FAMILY_LS_KEY(childId), next);
  return next;
}

export function readReviewsCompleted(childId: number): number {
  return readJson<number>(REVIEWS_DONE_LS_KEY(childId), 0);
}

export function bumpReviewsCompleted(childId: number): number {
  const n = readReviewsCompleted(childId) + 1;
  writeJson(REVIEWS_DONE_LS_KEY(childId), n);
  return n;
}

export function readTutorAsksV4(childId: number): number {
  return readJson<number>(TUTOR_ASKS_V4_LS_KEY(childId), 0);
}

export function bumpTutorAsksV4(childId: number): number {
  const n = readTutorAsksV4(childId) + 1;
  writeJson(TUTOR_ASKS_V4_LS_KEY(childId), n);
  return n;
}

export function readWeekendMissionDone(childId: number): boolean {
  const key = readJson<string | null>(WEEKEND_MISSION_LS_KEY(childId), null);
  return key === todayDateKey();
}

export function markWeekendMissionDone(childId: number): void {
  writeJson(WEEKEND_MISSION_LS_KEY(childId), todayDateKey());
}
