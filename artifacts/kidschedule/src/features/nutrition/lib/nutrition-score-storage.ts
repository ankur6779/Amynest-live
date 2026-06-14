import {
  computeNutritionScore,
  sanitizeChecklist,
  type ScoreChecklistId,
} from "@/features/nutrition/lib/nutrition-score";
import { computeMinDayMet } from "@/features/nutrition/lib/nutrition-streak";

export const NUTRITION_DAILY_SCORE_KEY = "nutrition:daily-score";
/** Sprint 2 legacy key — global, not child-scoped. */
export const LEGACY_NUTRITION_SCORE_KEY = "nutrition:daily-score";

export type DayProgressStatus = "completed" | "partial" | "empty";

export interface StoredDaySnapshot {
  score: number;
  checked: number;
  total: number;
  minDayMet?: boolean;
}

interface NutritionScoreStoreV2 {
  version: 2;
  childId: number;
  dateKey: string;
  checklist: Record<string, boolean>;
  history: Record<string, StoredDaySnapshot>;
  serverMigrated?: boolean;
}

/** @deprecated Sprint 2 shape — used for legacy import only. */
interface NutritionScoreStoreV1 {
  version: 1;
  dateKey: string;
  checklist: Record<string, boolean>;
  history: Record<string, StoredDaySnapshot>;
}

type ScoreListener = () => void;
const listeners = new Set<ScoreListener>();

export function subscribeNutritionScore(listener: ScoreListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notifyScoreListeners(): void {
  listeners.forEach((fn) => fn());
}

export function storageKeyForChild(childId: number): string {
  return `${NUTRITION_DAILY_SCORE_KEY}:${childId}`;
}

/** Local timezone date key (YYYY-MM-DD). */
export function dateKeyLocal(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultStore(childId: number, dateKey = dateKeyLocal()): NutritionScoreStoreV2 {
  return { version: 2, childId, dateKey, checklist: {}, history: {} };
}

function isValidSnapshot(v: unknown): v is StoredDaySnapshot {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.score === "number" &&
    typeof o.checked === "number" &&
    typeof o.total === "number" &&
    Number.isFinite(o.score)
  );
}

function enrichSnapshot(snapshot: StoredDaySnapshot): StoredDaySnapshot {
  return {
    ...snapshot,
    minDayMet: snapshot.minDayMet ?? computeMinDayMet(snapshot.checked),
  };
}

function parseStoreV2(raw: string | null, childId: number): NutritionScoreStoreV2 {
  if (!raw) return defaultStore(childId);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaultStore(childId);
    const o = parsed as Record<string, unknown>;

    if (o.version === 2 && typeof o.dateKey === "string") {
      const checklist = sanitizeChecklist(o.checklist);
      const history: Record<string, StoredDaySnapshot> = {};
      if (o.history && typeof o.history === "object") {
        for (const [key, val] of Object.entries(o.history as Record<string, unknown>)) {
          if (typeof key === "string" && isValidSnapshot(val)) {
            history[key] = enrichSnapshot(val);
          }
        }
      }
      return {
        version: 2,
        childId,
        dateKey: o.dateKey,
        checklist,
        history,
        serverMigrated: o.serverMigrated === true,
      };
    }

    if (o.version === 1 && typeof o.dateKey === "string") {
      return importLegacyV1(o as unknown as NutritionScoreStoreV1, childId);
    }

    return defaultStore(childId);
  } catch {
    return defaultStore(childId);
  }
}

function importLegacyV1(legacy: NutritionScoreStoreV1, childId: number): NutritionScoreStoreV2 {
  const history: Record<string, StoredDaySnapshot> = {};
  for (const [key, val] of Object.entries(legacy.history ?? {})) {
    if (isValidSnapshot(val)) history[key] = enrichSnapshot(val);
  }
  return {
    version: 2,
    childId,
    dateKey: legacy.dateKey,
    checklist: sanitizeChecklist(legacy.checklist),
    history,
    serverMigrated: false,
  };
}

/** Read Sprint 2 global store for one-time migration. */
export function readLegacyGlobalStore(): NutritionScoreStoreV1 | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(LEGACY_NUTRITION_SCORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (o.version !== 1 || typeof o.dateKey !== "string") return null;
    return o as unknown as NutritionScoreStoreV1;
  } catch {
    return null;
  }
}

export function mergeLegacyIntoStore(childId: number): NutritionScoreStoreV2 {
  const current = readRawStore(childId);
  const legacy = readLegacyGlobalStore();
  if (!legacy) return current;

  const history = { ...current.history };
  for (const [key, val] of Object.entries(legacy.history ?? {})) {
    if (isValidSnapshot(val) && !history[key]) {
      history[key] = enrichSnapshot(val);
    }
  }

  const today = dateKeyLocal();
  let checklist = current.checklist;
  let dateKey = current.dateKey;

  if (legacy.dateKey === today && Object.keys(current.checklist).length === 0) {
    checklist = sanitizeChecklist(legacy.checklist);
    dateKey = legacy.dateKey;
  }

  if (legacy.dateKey !== today && legacy.dateKey && !history[legacy.dateKey]) {
    const snap = computeNutritionScore(sanitizeChecklist(legacy.checklist));
    if (snap.checked > 0) {
      history[legacy.dateKey] = { ...snap, minDayMet: computeMinDayMet(snap.checked) };
    }
  }

  const merged: NutritionScoreStoreV2 = {
    version: 2,
    childId,
    dateKey,
    checklist,
    history,
    serverMigrated: current.serverMigrated,
  };
  writeStore(childId, merged);
  return merged;
}

function readRawStore(childId: number): NutritionScoreStoreV2 {
  if (typeof localStorage === "undefined") return defaultStore(childId);
  return parseStoreV2(localStorage.getItem(storageKeyForChild(childId)), childId);
}

function writeStore(childId: number, store: NutritionScoreStoreV2): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKeyForChild(childId), JSON.stringify(store));
    notifyScoreListeners();
  } catch {
    /* quota / private mode */
  }
}

/** Align store to today — resets checklist when the calendar day changes. */
export function alignStoreToToday(store: NutritionScoreStoreV2): NutritionScoreStoreV2 {
  const today = dateKeyLocal();
  if (store.dateKey === today) return store;

  const { score, checked, total } = computeNutritionScore(store.checklist);
  const history = { ...store.history };
  if (store.dateKey && checked > 0) {
    history[store.dateKey] = { score, checked, total, minDayMet: computeMinDayMet(checked) };
  }

  return {
    ...store,
    dateKey: today,
    checklist: {},
    history,
  };
}

export function loadNutritionScoreStore(childId: number): NutritionScoreStoreV2 {
  return alignStoreToToday(readRawStore(childId));
}

export function readTodayChecklist(childId: number): Record<string, boolean> {
  return { ...loadNutritionScoreStore(childId).checklist };
}

export function persistTodayChecklist(childId: number, checklist: Record<string, boolean>): void {
  const aligned = alignStoreToToday(readRawStore(childId));
  const { score, checked, total } = computeNutritionScore(checklist);
  const today = dateKeyLocal();

  writeStore(childId, {
    version: 2,
    childId,
    dateKey: today,
    checklist: sanitizeChecklist(checklist),
    history: {
      ...aligned.history,
      [today]: { score, checked, total, minDayMet: computeMinDayMet(checked) },
    },
    serverMigrated: aligned.serverMigrated,
  });
}

export function mergeServerDay(
  childId: number,
  dateKey: string,
  checklist: Record<string, boolean>,
  updatedAtMs: number,
): boolean {
  const local = readRawStore(childId);
  const today = dateKeyLocal();
  const isToday = dateKey === today;

  if (isToday && Object.keys(local.checklist).length > 0) {
    return false;
  }

  const { score, checked, total } = computeNutritionScore(checklist);
  const snapshot: StoredDaySnapshot = {
    score,
    checked,
    total,
    minDayMet: computeMinDayMet(checked),
  };

  const history = { ...local.history, [dateKey]: snapshot };
  const nextChecklist = isToday ? sanitizeChecklist(checklist) : local.checklist;

  writeStore(childId, {
    ...local,
    checklist: isToday ? nextChecklist : local.checklist,
    dateKey: local.dateKey,
    history,
    serverMigrated: local.serverMigrated,
  });

  void updatedAtMs;
  return true;
}

export function markServerMigrated(childId: number): void {
  const store = readRawStore(childId);
  writeStore(childId, { ...store, serverMigrated: true });
}

export function isServerMigrated(childId: number): boolean {
  return readRawStore(childId).serverMigrated === true;
}

export function getStoreHistory(childId: number): Record<string, StoredDaySnapshot> {
  return { ...loadNutritionScoreStore(childId).history };
}

export function getDayProgressStatus(snapshot: StoredDaySnapshot | undefined): DayProgressStatus {
  if (!snapshot || snapshot.checked === 0) return "empty";
  if (snapshot.score >= 80) return "completed";
  return "partial";
}

export interface WeekProgressDay {
  dateKey: string;
  label: string;
  status: DayProgressStatus;
  isToday: boolean;
}

function startOfWeekMonday(ref: Date): Date {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return d;
}

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export function getWeekProgress(childId: number, refDate = new Date()): WeekProgressDay[] {
  const store = loadNutritionScoreStore(childId);
  const monday = startOfWeekMonday(refDate);
  const todayKey = dateKeyLocal(refDate);

  return WEEK_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateKey = dateKeyLocal(d);

    let snapshot = store.history[dateKey];
    if (dateKey === store.dateKey && dateKey === todayKey) {
      snapshot = computeNutritionScore(store.checklist);
    }

    return {
      dateKey,
      label,
      status: getDayProgressStatus(snapshot),
      isToday: dateKey === todayKey,
    };
  });
}

export function toggleChecklistItem(
  checklist: Record<string, boolean>,
  id: ScoreChecklistId,
): Record<string, boolean> {
  const next = { ...checklist };
  if (next[id]) delete next[id];
  else next[id] = true;
  return next;
}

/** Test helper — clears storage for a child. */
export function clearNutritionScoreStorage(childId: number): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(storageKeyForChild(childId));
  notifyScoreListeners();
}

export function clearLegacyNutritionScoreStorage(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(LEGACY_NUTRITION_SCORE_KEY);
}
