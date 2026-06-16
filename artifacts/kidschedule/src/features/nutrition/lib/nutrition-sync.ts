import { parseApiJson } from "@/lib/safe-json-response";
/**
 * Nutrition Hub — offline-first server sync (health-lab / phonics-v3 pattern).
 *
 * Merge rules: see nutrition-sync-merge.ts
 */
import { getApiUrl } from "@/lib/api";
import {
  computeNutritionScore,
  sanitizeChecklist,
} from "@/features/nutrition/lib/nutrition-score";
import {
  dateKeyLocal,
  getDayUpdatedAt,
  loadNutritionScoreStore,
  markServerMigrated,
  mergeLegacyIntoStore,
  mergeServerDay,
  persistTodayChecklist,
  readDayChecklist,
  readLegacyGlobalStore,
  readTodayChecklist,
  clearLegacyNutritionScoreStorage,
  isServerMigrated,
  getStoreHistory,
} from "@/features/nutrition/lib/nutrition-score-storage";
import {
  shouldPushLocalToServer,
} from "@/features/nutrition/lib/nutrition-sync-merge";

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const QUEUE_KEY = "amynest:nutrition-sync-queue:";
const META_KEY = "amynest:nutrition-sync-meta:";
const hydrated = new Set<number>();
let globalFetch: AuthFetchFn | null = null;
let onlineListenerAttached = false;

type QueueEntry = { dateKey: string; enqueuedAt: number };

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

function loadQueue(childId: number): QueueEntry[] {
  try {
    const raw = localStorage.getItem(`${QUEUE_KEY}${childId}`);
    return raw ? (JSON.parse(raw) as QueueEntry[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(childId: number, q: QueueEntry[]): void {
  try {
    localStorage.setItem(`${QUEUE_KEY}${childId}`, JSON.stringify(q.slice(-30)));
  } catch {
    /* quota */
  }
}

export function readMeta(childId: number): number {
  try {
    return Number(localStorage.getItem(`${META_KEY}${childId}`) ?? 0);
  } catch {
    return 0;
  }
}

export function writeMeta(childId: number, ts: number): void {
  try {
    localStorage.setItem(`${META_KEY}${childId}`, String(ts));
  } catch {
    /* quota */
  }
}

export function configureNutritionSync(fetcher: AuthFetchFn): void {
  globalFetch = fetcher;
  if (typeof window === "undefined") return;
  if (!onlineListenerAttached) {
    window.addEventListener("online", () => {
      for (const id of hydrated) void flushNutritionSync(id);
    });
    onlineListenerAttached = true;
  }
}

async function putDailyScore(
  childId: number,
  dateKey: string,
  checklist: Record<string, boolean>,
): Promise<boolean> {
  const fetcher = globalFetch;
  if (!fetcher) return false;

  const res = await fetcher(getApiUrl("/api/nutrition/daily-score"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childId, dateKey, checklist }),
  });
  return res.ok;
}

async function migrateLocalHistoryToServer(childId: number): Promise<boolean> {
  if (isServerMigrated(childId)) return true;

  mergeLegacyIntoStore(childId);
  const store = loadNutritionScoreStore(childId);

  const daysToUpload = new Map<string, Record<string, boolean>>();

  for (const [dateKey, checklist] of Object.entries(store.dayChecklists)) {
    if (Object.keys(checklist).length > 0) {
      daysToUpload.set(dateKey, checklist);
    }
  }

  const today = dateKeyLocal();
  if (store.dateKey === today && Object.keys(store.checklist).length > 0) {
    daysToUpload.set(today, store.checklist);
  }

  let allOk = true;
  for (const [dateKey, checklist] of daysToUpload) {
    const ok = await putDailyScore(childId, dateKey, checklist);
    if (!ok) allOk = false;
  }

  if (!allOk) return false;

  markServerMigrated(childId);
  if (readLegacyGlobalStore()) {
    clearLegacyNutritionScoreStorage();
  }
  return true;
}

export async function hydrateNutritionScore(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<void> {
  if (authFetch) globalFetch = authFetch;
  hydrated.add(childId);

  mergeLegacyIntoStore(childId);

  const fetcher = globalFetch;
  if (!fetcher || !isOnline()) return;

  try {
    await migrateLocalHistoryToServer(childId);

    const today = dateKeyLocal();
    const localMeta = readMeta(childId);

    const res = await fetcher(
      getApiUrl(`/api/nutrition/daily-score?childId=${childId}&date=${today}`),
    );
    if (res.ok) {
      const json = await parseApiJson<{
        log?: {
          dateKey: string;
          checklist: Record<string, boolean>;
          updatedAt?: string;
        } | null;
        }>(res);
      if (json.log?.checklist) {
        const serverChecklist = sanitizeChecklist(json.log.checklist);
        const serverTs = json.log.updatedAt ? Date.parse(json.log.updatedAt) : 0;
        const localChecklist = readTodayChecklist(childId);
        const localDayTs = getDayUpdatedAt(childId, today);

        if (
          shouldPushLocalToServer(
            localDayTs,
            serverTs,
            Object.keys(localChecklist).length > 0,
          )
        ) {
          await putDailyScore(childId, today, localChecklist);
        } else {
          mergeServerDay(childId, json.log.dateKey, serverChecklist, serverTs || Date.now());
        }

        writeMeta(childId, Math.max(localMeta, serverTs, localDayTs, Date.now()));
      }
    }

    const trendRes = await fetcher(
      getApiUrl(`/api/nutrition/weekly-trend?childId=${childId}&date=${today}`),
    );
    if (trendRes.ok) {
      const trendJson = (await parseApiJson<{
        days?: Array<{
          dateKey: string;
          score: number;
          checked: number;
          minDayMet: boolean;
          checklist?: Record<string, boolean>;
          updatedAt?: string;
        }>;
      }>(trendRes));
      for (const day of trendJson.days ?? []) {
        if (!day.checklist || day.dateKey === today) continue;
        const serverTs = day.updatedAt ? Date.parse(day.updatedAt) : 0;
        mergeServerDay(childId, day.dateKey, day.checklist, serverTs || Date.now());
      }
    }

    writeMeta(childId, Math.max(readMeta(childId), Date.now()));
    await flushNutritionSync(childId);
  } catch {
    /* offline — local cache remains */
  }
}

export function enqueueNutritionSync(childId: number, dateKey = dateKeyLocal()): void {
  const ts = Date.now();
  writeMeta(childId, ts);
  const q = loadQueue(childId).filter((e) => e.dateKey !== dateKey);
  q.push({ dateKey, enqueuedAt: ts });
  saveQueue(childId, q);
  if (isOnline() && globalFetch) void flushNutritionSync(childId);
}

/** Resolve canonical checklist payload for a queued sync date. */
export function resolveChecklistForSyncDate(
  childId: number,
  dateKey: string,
): Record<string, boolean> {
  return readDayChecklist(childId, dateKey);
}

export async function flushNutritionSync(childId: number): Promise<boolean> {
  const fetcher = globalFetch;
  if (!fetcher || !isOnline()) return false;

  const queue = loadQueue(childId);
  if (queue.length === 0) return true;

  const remaining: QueueEntry[] = [];

  try {
    for (const entry of queue) {
      const checklist = resolveChecklistForSyncDate(childId, entry.dateKey);
      if (Object.keys(checklist).length === 0) {
        continue;
      }
      const ok = await putDailyScore(childId, entry.dateKey, checklist);
      if (!ok) {
        remaining.push(entry);
      }
    }

    saveQueue(childId, remaining);
    if (remaining.length === 0) {
      writeMeta(childId, Date.now());
    }
    return remaining.length === 0;
  } catch {
    return false;
  }
}

export async function fetchNutritionStreak(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<number | null> {
  const fetcher = authFetch ?? globalFetch;
  if (!fetcher || !isOnline()) return null;

  try {
    const today = dateKeyLocal();
    const res = await fetcher(getApiUrl(`/api/nutrition/streak?childId=${childId}&date=${today}`));
    if (!res.ok) return null;
    const json = (await parseApiJson<{ streak?: number }>(res));
    return typeof json.streak === "number" ? json.streak : null;
  } catch {
    return null;
  }
}

export type WeeklyTrendDayPayload = {
  dateKey: string;
  score: number;
  checked: number;
  minDayMet: boolean;
  checklist?: Record<string, boolean>;
  updatedAt?: string;
};

export async function fetchNutritionWeeklyTrend(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<WeeklyTrendDayPayload[] | null> {
  const fetcher = authFetch ?? globalFetch;
  if (!fetcher || !isOnline()) return null;

  try {
    const today = dateKeyLocal();
    const res = await fetcher(
      getApiUrl(`/api/nutrition/weekly-trend?childId=${childId}&date=${today}`),
    );
    if (!res.ok) return null;
    const json = (await parseApiJson<{ days?: WeeklyTrendDayPayload[] }>(res));
    return json.days ?? null;
  } catch {
    return null;
  }
}

/** Merge server weekly trend into local store (canonical checklists). */
export async function mergeWeeklyTrendFromServer(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<void> {
  const days = await fetchNutritionWeeklyTrend(childId, authFetch);
  if (!days) return;
  const today = dateKeyLocal();
  for (const day of days) {
    if (!day.checklist || day.dateKey === today) continue;
    const serverTs = day.updatedAt ? Date.parse(day.updatedAt) : 0;
    mergeServerDay(childId, day.dateKey, day.checklist, serverTs || Date.now());
  }
}

export function getLocalWeeklyTrend(childId: number) {
  const store = loadNutritionScoreStore(childId);
  const today = dateKeyLocal();
  const live = computeNutritionScore(store.checklist);
  return { history: getStoreHistory(childId), liveToday: { dateKey: today, ...live, minDayMet: live.checked > 0 } };
}
