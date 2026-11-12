import { parseApiJson } from "@/lib/safe-json-response";
/**
 * Amy Health Lab™ — offline-first server sync (phonics-v3 pattern).
 */
import { getApiUrl } from "@/lib/api";
import {
  loadHealthLabState,
  saveHealthLabState,
  defaultHealthLabState,
} from "./storage";
import type { HealthLabPersistedState } from "./types";
import { trackHealthLabEvent } from "./health-lab-analytics";

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

const QUEUE_KEY = "amynest:health-lab-sync-queue:";
const META_KEY = "amynest:health-lab-sync-meta:";
const hydrated = new Set<number>();
let globalFetch: AuthFetchFn | null = null;

/** Per-child single-flight + coalesced reflush after local advances mid-request. */
const flushInFlight = new Map<number, Promise<boolean>>();
const flushAgain = new Set<number>();

type QueueEntry = { kind: "full" | "session"; clientUpdatedAt: number };

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
    localStorage.setItem(`${QUEUE_KEY}${childId}`, JSON.stringify(q.slice(-20)));
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

function mergeState(
  local: HealthLabPersistedState,
  server: Partial<HealthLabPersistedState> | null,
  serverTs: number,
  localTs: number,
): HealthLabPersistedState {
  if (!server || Object.keys(server).length === 0) return local;
  if (localTs >= serverTs) {
    const historyMap = new Map<number, HealthLabPersistedState["gameHistory"][number]>();
    for (const s of server.gameHistory ?? []) historyMap.set(s.timestamp, s);
    for (const s of local.gameHistory) historyMap.set(s.timestamp, s);
    const mergedHistory = [...historyMap.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-500);
    const badgeMap = new Map<string, HealthLabPersistedState["badges"][number]>();
    for (const b of server.badges ?? []) badgeMap.set(b.id, b);
    for (const b of local.badges) badgeMap.set(b.id, b);
    return {
      ...local,
      ...server,
      totalXp: Math.max(local.totalXp, server.totalXp ?? 0),
      coins: Math.max(local.coins, server.coins ?? 0),
      streakDays: Math.max(local.streakDays, server.streakDays ?? 0),
      gameHistory: mergedHistory,
      badges: [...badgeMap.values()],
    };
  }
  return { ...defaultHealthLabState(local.childId), ...server, childId: local.childId } as HealthLabPersistedState;
}

export function configureHealthLabSync(fetcher: AuthFetchFn): void {
  globalFetch = fetcher;
  if (typeof window === "undefined") return;
  if (!onlineListenerAttached) {
    window.addEventListener("online", () => {
      for (const id of hydrated) void flushHealthLabSync(id);
    });
    onlineListenerAttached = true;
  }
}

let onlineListenerAttached = false;

/** Test-only: clear in-flight flush bookkeeping between cases. */
export function resetHealthLabSyncForTests(): void {
  flushInFlight.clear();
  flushAgain.clear();
  hydrated.clear();
  globalFetch = null;
}

export async function hydrateHealthLabProfile(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<HealthLabPersistedState> {
  if (authFetch) globalFetch = authFetch;
  hydrated.add(childId);

  const local = loadHealthLabState(childId);
  const localTs = readMeta(childId) || Date.now();

  if (globalFetch && isOnline()) {
    try {
      const res = await globalFetch(getApiUrl(`/api/health-lab/profile/${childId}`));
      if (res.ok) {
        const json = await parseApiJson<{
          profile?: Partial<HealthLabPersistedState> | null;
          clientUpdatedAt?: number;
        }>(res);
        if (json.profile) {
          const merged = mergeState(local, json.profile, json.clientUpdatedAt ?? 0, localTs);
          saveHealthLabState(merged);
          writeMeta(childId, Math.max(localTs, json.clientUpdatedAt ?? 0));
          trackHealthLabEvent("health_lab_sync_success", childId, { action: "hydrate" });
          await flushHealthLabSync(childId);
          return merged;
        }
      }
    } catch {
      trackHealthLabEvent("health_lab_sync_failure", childId, { action: "hydrate" });
    }
  }

  return local;
}

export function enqueueHealthLabSync(childId: number): void {
  const ts = Date.now();
  writeMeta(childId, ts);
  const q = loadQueue(childId).filter((e) => e.kind !== "full");
  q.push({ kind: "full", clientUpdatedAt: ts });
  saveQueue(childId, q);
  if (isOnline() && globalFetch) void flushHealthLabSync(childId);
}

/**
 * Flush queued profile sync. Single-flight per child: concurrent callers coalesce
 * into one follow-up flush so a slow response cannot wipe newer local progress
 * or clear a queue that advanced mid-flight.
 */
export async function flushHealthLabSync(childId: number): Promise<boolean> {
  const existing = flushInFlight.get(childId);
  if (existing) {
    flushAgain.add(childId);
    return existing;
  }

  const run = runFlushHealthLabSync(childId).finally(() => {
    flushInFlight.delete(childId);
  });
  flushInFlight.set(childId, run);

  const ok = await run;
  if (flushAgain.delete(childId)) {
    return flushHealthLabSync(childId);
  }
  return ok;
}

async function runFlushHealthLabSync(childId: number): Promise<boolean> {
  const fetcher = globalFetch;
  if (!fetcher || !isOnline()) return false;

  const queue = loadQueue(childId);
  if (queue.length === 0) return true;

  const state = loadHealthLabState(childId);
  const clientUpdatedAt = readMeta(childId) || Date.now();

  try {
    const res = await fetcher(getApiUrl("/api/health-lab/sync"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, profile: state, clientUpdatedAt }),
    });
    if (!res.ok) {
      trackHealthLabEvent("health_lab_sync_failure", childId, { status: res.status });
      return false;
    }
    const json = (await parseApiJson<{ profile?: Partial<HealthLabPersistedState> }>(res));

    const metaNow = readMeta(childId);
    // Local play advanced while this request was in flight — never clobber or
    // drop the queue; a coalesced reflush will push the newer snapshot.
    if (metaNow > clientUpdatedAt) {
      const q = loadQueue(childId);
      if (q.length === 0) {
        saveQueue(childId, [{ kind: "full", clientUpdatedAt: metaNow }]);
      }
      flushAgain.add(childId);
      trackHealthLabEvent("health_lab_sync_success", childId, { action: "flush_stale_skipped" });
      return true;
    }

    if (json.profile) {
      const current = loadHealthLabState(childId);
      const merged = mergeState(current, json.profile, clientUpdatedAt, metaNow || clientUpdatedAt);
      saveHealthLabState(merged);
    }
    saveQueue(childId, []);
    trackHealthLabEvent("health_lab_sync_success", childId, { action: "flush" });
    return true;
  } catch {
    trackHealthLabEvent("health_lab_sync_failure", childId, { action: "flush" });
    return false;
  }
}

export async function postHealthLabSession(
  childId: number,
  session: HealthLabPersistedState["gameHistory"][number],
): Promise<void> {
  // Caller should persist local progress before this so enqueue/flush see fresh state.
  enqueueHealthLabSync(childId);
  const fetcher = globalFetch;
  if (!fetcher || !isOnline()) return;
  try {
    await fetcher(getApiUrl("/api/health-lab/session"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        childId,
        session,
        // Align with profile sync meta so session append cannot outrank full sync.
        clientUpdatedAt: readMeta(childId) || Date.now(),
      }),
    });
  } catch {
    /* queued via enqueue */
  }
}
