/**
 * Nutrition Hub — offline-first server sync (health-lab / phonics-v3 pattern).
 */
import { getApiUrl } from "@/lib/api";
import {
  computeNutritionScore,
  sanitizeChecklist,
} from "@/features/nutrition/lib/nutrition-score";
import {
  dateKeyLocal,
  loadNutritionScoreStore,
  markServerMigrated,
  mergeLegacyIntoStore,
  mergeServerDay,
  persistTodayChecklist,
  readLegacyGlobalStore,
  readTodayChecklist,
  clearLegacyNutritionScoreStorage,
  isServerMigrated,
  getStoreHistory,
} from "@/features/nutrition/lib/nutrition-score-storage";

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

function readMeta(childId: number): number {
  try {
    return Number(localStorage.getItem(`${META_KEY}${childId}`) ?? 0);
  } catch {
    return 0;
  }
}

function writeMeta(childId: number, ts: number): void {
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
  const today = dateKeyLocal();

  const daysToUpload = new Map<string, Record<string, boolean>>();

  for (const [dateKey, snap] of Object.entries(store.history)) {
    if (snap.checked > 0) {
      daysToUpload.set(dateKey, {});
    }
  }

  if (store.dateKey === today && Object.keys(store.checklist).length > 0) {
    daysToUpload.set(today, store.checklist);
  }

  let allOk = true;
  for (const [dateKey] of daysToUpload) {
    let checklist: Record<string, boolean> = {};
    if (dateKey === today) {
      checklist = store.checklist;
    } else {
      const snap = store.history[dateKey];
      if (snap && snap.checked > 0) {
        checklist = reconstructChecklistFromCount(snap.checked);
      }
    }
    if (Object.keys(checklist).length > 0) {
      const ok = await putDailyScore(childId, dateKey, checklist);
      if (!ok) allOk = false;
    }
  }

  if (!allOk) return false;

  markServerMigrated(childId);
  if (readLegacyGlobalStore()) {
    clearLegacyNutritionScoreStorage();
  }
  return true;
}

/** Best-effort reconstruction when only snapshot counts exist in legacy history. */
function reconstructChecklistFromCount(checked: number): Record<string, boolean> {
  const ids = [
    "breakfast",
    "protein",
    "dairy",
    "greens",
    "fruit",
    "water",
    "noJunk",
    "wholegrains",
  ] as const;
  const out: Record<string, boolean> = {};
  for (let i = 0; i < Math.min(checked, ids.length); i++) {
    out[ids[i]!] = true;
  }
  return out;
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
    const res = await fetcher(
      getApiUrl(`/api/nutrition/daily-score?childId=${childId}&date=${today}`),
    );
    if (res.ok) {
      const json = (await res.json()) as {
        log?: {
          dateKey: string;
          checklist: Record<string, boolean>;
          updatedAt?: string;
        } | null;
      };
      if (json.log?.checklist) {
        const serverChecklist = sanitizeChecklist(json.log.checklist);
        const localChecklist = readTodayChecklist(childId);
        const localHasData = Object.keys(localChecklist).length > 0;
        const serverHasData = Object.keys(serverChecklist).length > 0;

        if (serverHasData && !localHasData) {
          persistTodayChecklist(childId, serverChecklist);
        } else if (localHasData) {
          await putDailyScore(childId, today, localChecklist);
        }

        mergeServerDay(
          childId,
          json.log.dateKey,
          serverChecklist,
          json.log.updatedAt ? Date.parse(json.log.updatedAt) : Date.now(),
        );
      }
    }

    const trendRes = await fetcher(
      getApiUrl(`/api/nutrition/weekly-trend?childId=${childId}&date=${today}`),
    );
    if (trendRes.ok) {
      const trendJson = (await trendRes.json()) as {
        days?: Array<{ dateKey: string; score: number; checked: number; minDayMet: boolean }>;
      };
      for (const day of trendJson.days ?? []) {
        if (day.checked > 0 && day.dateKey !== today) {
          mergeServerDay(childId, day.dateKey, reconstructChecklistFromCount(day.checked), Date.now());
        }
      }
    }

    writeMeta(childId, Date.now());
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

/** Resolve checklist payload for a queued sync date (today from live checklist, history otherwise). */
export function resolveChecklistForSyncDate(
  childId: number,
  dateKey: string,
): Record<string, boolean> {
  const today = dateKeyLocal();
  if (dateKey === today) {
    return readTodayChecklist(childId);
  }
  const store = loadNutritionScoreStore(childId);
  const snap = store.history[dateKey];
  if (!snap || snap.checked <= 0) return {};
  return reconstructChecklistFromCount(snap.checked);
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
    const json = (await res.json()) as { streak?: number };
    return typeof json.streak === "number" ? json.streak : null;
  } catch {
    return null;
  }
}

export async function fetchNutritionWeeklyTrend(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<Array<{ dateKey: string; score: number; checked: number; minDayMet: boolean }> | null> {
  const fetcher = authFetch ?? globalFetch;
  if (!fetcher || !isOnline()) return null;

  try {
    const today = dateKeyLocal();
    const res = await fetcher(
      getApiUrl(`/api/nutrition/weekly-trend?childId=${childId}&date=${today}`),
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      days?: Array<{ dateKey: string; score: number; checked: number; minDayMet: boolean }>;
    };
    return json.days ?? null;
  } catch {
    return null;
  }
}

export function getLocalWeeklyTrend(childId: number) {
  const store = loadNutritionScoreStore(childId);
  const today = dateKeyLocal();
  const live = computeNutritionScore(store.checklist);
  return { history: getStoreHistory(childId), liveToday: { dateKey: today, ...live, minDayMet: live.checked > 0 } };
}
