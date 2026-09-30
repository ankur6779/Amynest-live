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

function maxNum(...vals: Array<number | null | undefined>): number {
  let best = 0;
  for (const v of vals) {
    const n = Number(v ?? 0);
    if (Number.isFinite(n) && n > best) best = n;
  }
  return best;
}

function unionIds(...lists: Array<readonly string[] | undefined>): string[] {
  const out = new Set<string>();
  for (const list of lists) {
    for (const id of list ?? []) {
      if (id) out.add(id);
    }
  }
  return [...out];
}

function unionNums(...lists: Array<readonly number[] | undefined>): number[] {
  const out = new Set<number>();
  for (const list of lists) {
    for (const n of list ?? []) {
      if (Number.isFinite(n)) out.add(n);
    }
  }
  return [...out].sort((a, b) => a - b);
}

function maxRecord(
  a: Record<string, number> | undefined,
  b: Record<string, number> | undefined,
): Record<string, number> {
  const out: Record<string, number> = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b ?? {})) {
    if (!Number.isFinite(v)) continue;
    out[k] = Math.max(Number(out[k] ?? 0), v);
  }
  return out;
}

/**
 * Field-level CRDT when local watermark is newer.
 * Blind `{...local, ...server}` let a virgin NOW-stamp wipe richer peer progress
 * on the next flush; blind reverse spread wiped offline local advances on hydrate.
 */
export function mergeHealthLabState(
  local: HealthLabPersistedState,
  server: Partial<HealthLabPersistedState> | null,
  serverTs: number,
  localTs: number,
): HealthLabPersistedState {
  if (!server || Object.keys(server).length === 0) return local;
  if (localTs < serverTs) {
    return { ...defaultHealthLabState(local.childId), ...server, childId: local.childId } as HealthLabPersistedState;
  }

  const historyMap = new Map<number, HealthLabPersistedState["gameHistory"][number]>();
  for (const s of server.gameHistory ?? []) historyMap.set(s.timestamp, s);
  for (const s of local.gameHistory) historyMap.set(s.timestamp, s);
  const mergedHistory = [...historyMap.values()].sort((a, b) => a.timestamp - b.timestamp).slice(-500);
  const badgeMap = new Map<string, HealthLabPersistedState["badges"][number]>();
  for (const b of server.badges ?? []) badgeMap.set(b.id, b);
  for (const b of local.badges) badgeMap.set(b.id, b);

  const serverRank = maxNum(server.prestige) * 1000 + maxNum(server.level, 1);
  const localRank = maxNum(local.prestige) * 1000 + maxNum(local.level, 1);
  const richer = localRank >= serverRank ? local : server;

  const serverPlay = server.lastPlayDateKey ?? null;
  const localPlay = local.lastPlayDateKey;
  const lastPlayDateKey =
    serverPlay && localPlay
      ? serverPlay >= localPlay
        ? serverPlay
        : localPlay
      : localPlay ?? serverPlay;

  return {
    ...defaultHealthLabState(local.childId),
    ...local,
    ...server,
    childId: local.childId,
    totalXp: Math.max(local.totalXp, server.totalXp ?? 0),
    coins: Math.max(local.coins, server.coins ?? 0),
    streakDays: Math.max(local.streakDays, server.streakDays ?? 0),
    level: maxNum(local.level, server.level, 1) as HealthLabPersistedState["level"],
    prestige: maxNum(local.prestige, server.prestige),
    questStreakDays: maxNum(local.questStreakDays, server.questStreakDays),
    totalSessions: maxNum(local.totalSessions, server.totalSessions),
    weeklyChallengeProgress: maxNum(
      local.weeklyChallengeProgress,
      server.weeklyChallengeProgress,
    ),
    unlockedAvatarItems: unionIds(local.unlockedAvatarItems, server.unlockedAvatarItems),
    gamesCompletedToday: unionIds(local.gamesCompletedToday, server.gamesCompletedToday),
    streakMilestonesCelebrated: unionIds(
      local.streakMilestonesCelebrated,
      server.streakMilestonesCelebrated,
    ),
    personalBests: maxRecord(
      local.personalBests as Record<string, number>,
      server.personalBests as Record<string, number> | undefined,
    ) as HealthLabPersistedState["personalBests"],
    wellnessScores: {
      ...defaultHealthLabState(local.childId).wellnessScores,
      ...maxRecord(
        local.wellnessScores as Record<string, number>,
        server.wellnessScores as Record<string, number> | undefined,
      ),
    } as HealthLabPersistedState["wellnessScores"],
    gameHistory: mergedHistory,
    badges: [...badgeMap.values()],
    avatarId: (richer.avatarId as HealthLabPersistedState["avatarId"]) ?? local.avatarId,
    equippedItems: {
      ...(defaultHealthLabState(local.childId).equippedItems),
      ...((richer.equippedItems as HealthLabPersistedState["equippedItems"]) ?? local.equippedItems),
    },
    lastPlayDateKey,
  };
}

function mergeState(
  local: HealthLabPersistedState,
  server: Partial<HealthLabPersistedState> | null,
  serverTs: number,
  localTs: number,
): HealthLabPersistedState {
  return mergeHealthLabState(local, server, serverTs, localTs);
}

export function configureHealthLabSync(fetcher: AuthFetchFn): void {
  globalFetch = fetcher;
  if (typeof window === "undefined") return;
  if (!onlineListenerAttached) {
    window.addEventListener("online", () => {
      // Re-hydrate before flush so a virgin/offline local NOW-stamp cannot
      // push empty defaults over richer server progress when connectivity returns.
      for (const id of hydrated) void hydrateHealthLabProfile(id);
    });
    onlineListenerAttached = true;
  }
}

let onlineListenerAttached = false;

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

export async function flushHealthLabSync(childId: number): Promise<boolean> {
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
    if (json.profile) {
      const merged = mergeState(state, json.profile, clientUpdatedAt, clientUpdatedAt);
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
        clientUpdatedAt: Date.now(),
      }),
    });
  } catch {
    /* queued via enqueue */
  }
}
