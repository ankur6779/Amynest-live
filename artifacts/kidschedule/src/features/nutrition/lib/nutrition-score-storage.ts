import {
  computeNutritionScore,
  sanitizeChecklist,
  type ScoreChecklistId,
} from "@/features/nutrition/lib/nutrition-score";
import { computeMinDayMet } from "@/features/nutrition/lib/nutrition-streak";
import {
  shouldApplyServerToLocal,
  type MergeOutcome,
} from "@/features/nutrition/lib/nutrition-sync-merge";

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

/** Canonical per-day checklists — never derive from counts. */
interface NutritionScoreStoreV3 {
  version: 3;
  childId: number;
  dateKey: string;
  checklist: Record<string, boolean>;
  history: Record<string, StoredDaySnapshot>;
  /** Exact checklist payload per dateKey for sync and history. */
  dayChecklists: Record<string, Record<string, boolean>>;
  /** Per-day LWW timestamps (ms since epoch). */
  dayUpdatedAt: Record<string, number>;
  serverMigrated?: boolean;
}

type NutritionScoreStore = NutritionScoreStoreV3;

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

function defaultStore(childId: number, dateKey = dateKeyLocal()): NutritionScoreStoreV3 {
  return {
    version: 3,
    childId,
    dateKey,
    checklist: {},
    history: {},
    dayChecklists: {},
    dayUpdatedAt: {},
  };
}

function upgradeV2ToV3(v2: NutritionScoreStoreV2): NutritionScoreStoreV3 {
  const dayChecklists: Record<string, Record<string, boolean>> = {};
  const dayUpdatedAt: Record<string, number> = {};
  const todayChecklist = sanitizeChecklist(v2.checklist);
  if (v2.dateKey && Object.keys(todayChecklist).length > 0) {
    dayChecklists[v2.dateKey] = todayChecklist;
    dayUpdatedAt[v2.dateKey] = Date.now();
  }
  return {
    version: 3,
    childId: v2.childId,
    dateKey: v2.dateKey,
    checklist: todayChecklist,
    history: { ...v2.history },
    dayChecklists,
    dayUpdatedAt,
    serverMigrated: v2.serverMigrated,
  };
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

function parseDayChecklists(raw: unknown): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === "string" && val && typeof val === "object") {
      const checklist = sanitizeChecklist(val);
      if (Object.keys(checklist).length > 0) out[key] = checklist;
    }
  }
  return out;
}

function parseDayUpdatedAt(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof key === "string" && typeof val === "number" && Number.isFinite(val)) {
      out[key] = val;
    }
  }
  return out;
}

function parseStoreV3(raw: string | null, childId: number): NutritionScoreStoreV3 {
  if (!raw) return defaultStore(childId);
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return defaultStore(childId);
    const o = parsed as Record<string, unknown>;

    if (o.version === 3 && typeof o.dateKey === "string") {
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
        version: 3,
        childId,
        dateKey: o.dateKey,
        checklist,
        history,
        dayChecklists: parseDayChecklists(o.dayChecklists),
        dayUpdatedAt: parseDayUpdatedAt(o.dayUpdatedAt),
        serverMigrated: o.serverMigrated === true,
      };
    }

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
      return upgradeV2ToV3({
        version: 2,
        childId,
        dateKey: o.dateKey,
        checklist,
        history,
        serverMigrated: o.serverMigrated === true,
      });
    }

    if (o.version === 1 && typeof o.dateKey === "string") {
      return upgradeV2ToV3(importLegacyV1(o as unknown as NutritionScoreStoreV1, childId));
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

export function mergeLegacyIntoStore(childId: number): NutritionScoreStoreV3 {
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

  const dayChecklists = { ...current.dayChecklists };
  const dayUpdatedAt = { ...current.dayUpdatedAt };

  if (legacy.dateKey === today && Object.keys(checklist).length > 0) {
    dayChecklists[today] = checklist;
    dayUpdatedAt[today] = Math.max(dayUpdatedAt[today] ?? 0, Date.now());
  }

  if (legacy.dateKey !== today && legacy.dateKey && !history[legacy.dateKey]) {
    const legacyChecklist = sanitizeChecklist(legacy.checklist);
    const snap = computeNutritionScore(legacyChecklist);
    if (snap.checked > 0) {
      history[legacy.dateKey] = { ...snap, minDayMet: computeMinDayMet(snap.checked) };
      if (Object.keys(legacyChecklist).length > 0) {
        dayChecklists[legacy.dateKey] = legacyChecklist;
        dayUpdatedAt[legacy.dateKey] = Math.max(dayUpdatedAt[legacy.dateKey] ?? 0, Date.now());
      }
    }
  }

  const merged: NutritionScoreStoreV3 = {
    version: 3,
    childId,
    dateKey,
    checklist,
    history,
    dayChecklists,
    dayUpdatedAt,
    serverMigrated: current.serverMigrated,
  };
  writeStore(childId, merged);
  return merged;
}

function readRawStore(childId: number): NutritionScoreStoreV3 {
  if (typeof localStorage === "undefined") return defaultStore(childId);
  return parseStoreV3(localStorage.getItem(storageKeyForChild(childId)), childId);
}

function writeStore(childId: number, store: NutritionScoreStoreV3): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(storageKeyForChild(childId), JSON.stringify(store));
    notifyScoreListeners();
  } catch {
    /* quota / private mode */
  }
}

/** Align store to today — resets checklist when the calendar day changes. */
export function alignStoreToToday(store: NutritionScoreStoreV3): NutritionScoreStoreV3 {
  const today = dateKeyLocal();
  if (store.dateKey === today) return store;

  const sanitized = sanitizeChecklist(store.checklist);
  const { score, checked, total } = computeNutritionScore(sanitized);
  const history = { ...store.history };
  const dayChecklists = { ...store.dayChecklists };
  const dayUpdatedAt = { ...store.dayUpdatedAt };

  if (store.dateKey && checked > 0) {
    history[store.dateKey] = { score, checked, total, minDayMet: computeMinDayMet(checked) };
    dayChecklists[store.dateKey] = sanitized;
    dayUpdatedAt[store.dateKey] = Math.max(dayUpdatedAt[store.dateKey] ?? 0, Date.now());
  }

  return {
    ...store,
    dateKey: today,
    checklist: {},
    history,
    dayChecklists,
    dayUpdatedAt,
  };
}

export function loadNutritionScoreStore(childId: number): NutritionScoreStoreV3 {
  return alignStoreToToday(readRawStore(childId));
}

export function readTodayChecklist(childId: number): Record<string, boolean> {
  return { ...loadNutritionScoreStore(childId).checklist };
}

export function getDayUpdatedAt(childId: number, dateKey: string): number {
  return readRawStore(childId).dayUpdatedAt[dateKey] ?? 0;
}

export function readDayChecklist(childId: number, dateKey: string): Record<string, boolean> {
  const store = loadNutritionScoreStore(childId);
  const today = dateKeyLocal();
  if (dateKey === today && store.dateKey === today) {
    return { ...store.checklist };
  }
  const canonical = store.dayChecklists[dateKey];
  return canonical ? { ...canonical } : {};
}

export function persistTodayChecklist(childId: number, checklist: Record<string, boolean>): void {
  const aligned = alignStoreToToday(readRawStore(childId));
  const sanitized = sanitizeChecklist(checklist);
  const { score, checked, total } = computeNutritionScore(sanitized);
  const today = dateKeyLocal();
  const now = Date.now();

  writeStore(childId, {
    version: 3,
    childId,
    dateKey: today,
    checklist: sanitized,
    history: {
      ...aligned.history,
      [today]: { score, checked, total, minDayMet: computeMinDayMet(checked) },
    },
    dayChecklists: { ...aligned.dayChecklists, [today]: sanitized },
    dayUpdatedAt: { ...aligned.dayUpdatedAt, [today]: now },
    serverMigrated: aligned.serverMigrated,
  });
}

export function mergeServerDay(
  childId: number,
  dateKey: string,
  checklist: Record<string, boolean>,
  updatedAtMs: number,
): MergeOutcome {
  const local = readRawStore(childId);
  const today = dateKeyLocal();
  const isToday = dateKey === today;
  const sanitized = sanitizeChecklist(checklist);
  const hasServerChecklist = Object.keys(sanitized).length > 0;

  if (!hasServerChecklist) return "skipped_empty";

  const localUpdatedAt = local.dayUpdatedAt[dateKey] ?? 0;
  if (!shouldApplyServerToLocal(localUpdatedAt, updatedAtMs, hasServerChecklist)) {
    return "kept_local";
  }

  const { score, checked, total } = computeNutritionScore(sanitized);
  const snapshot: StoredDaySnapshot = {
    score,
    checked,
    total,
    minDayMet: computeMinDayMet(checked),
  };

  const history = { ...local.history, [dateKey]: snapshot };
  const dayChecklists = { ...local.dayChecklists, [dateKey]: sanitized };
  const dayUpdatedAt = { ...local.dayUpdatedAt, [dateKey]: updatedAtMs };

  writeStore(childId, {
    ...local,
    checklist: isToday && local.dateKey === today ? sanitized : local.checklist,
    dateKey: local.dateKey,
    history,
    dayChecklists,
    dayUpdatedAt,
    serverMigrated: local.serverMigrated,
  });

  return "applied_server";
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
