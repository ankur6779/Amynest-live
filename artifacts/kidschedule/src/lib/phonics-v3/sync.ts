/**
 * Offline-first Phonics V3 sync — local cache + queued writes + server merge.
 */
import { getApiUrl } from "@/lib/api";
import type { PhonicsMasteryState } from "./mastery-engine";
import { defaultMasteryState, loadMasteryState, saveMasteryState } from "./mastery-engine";
import type { PhonicsFluencyState } from "./fluency-tracker";
import { defaultFluencyState, loadFluencyState, saveFluencyState } from "./fluency-tracker";
import {
  defaultStoryProgressState,
  loadStoryProgressLocal,
  saveStoryProgressLocal,
  type PhonicsStoryProgressState,
} from "./story-progress";
import type { DailyReadingMission } from "@/lib/phonics-v2/daily-missions";
import {
  defaultRetentionPayload,
  mergePhonicsV3Bundle,
  type PhonicsV3Domain,
  type PhonicsV3ProgressBundle,
} from "@workspace/phonics-v3-progress";
import {
  loadRetentionState,
  retentionPayloadToState,
  retentionStateToPayload,
  saveRetentionState,
  type PhonicsRetentionState,
} from "./spaced-repetition";

export type AuthFetchFn = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

type SyncQueueEntry = {
  domain: PhonicsV3Domain;
  clientUpdatedAt: number;
};

const QUEUE_PREFIX = "amynest:phonics-v3-sync-queue:";
const META_PREFIX = "amynest:phonics-v3-sync-meta:";
const MISSION_PREFIX = "amynest:phonics-v2-mission:";
const hydratedChildren = new Set<number>();
let onlineListenerAttached = false;
let globalAuthFetch: AuthFetchFn | null = null;

function nowMs(): number {
  return Date.now();
}

function loadQueue(childId: number): SyncQueueEntry[] {
  try {
    const raw = localStorage.getItem(`${QUEUE_PREFIX}${childId}`);
    return raw ? (JSON.parse(raw) as SyncQueueEntry[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(childId: number, queue: SyncQueueEntry[]): void {
  try {
    localStorage.setItem(`${QUEUE_PREFIX}${childId}`, JSON.stringify(queue));
  } catch {
    /* quota */
  }
}

function enqueueSync(childId: number, domain: PhonicsV3Domain, clientUpdatedAt: number): void {
  const queue = loadQueue(childId).filter((q) => q.domain !== domain);
  queue.push({ domain, clientUpdatedAt });
  saveQueue(childId, queue);
}

function bundleFromLocal(childId: number): PhonicsV3ProgressBundle {
  const missionRaw = localStorage.getItem(`${MISSION_PREFIX}${childId}`);
  let missions: PhonicsV3ProgressBundle["missions"] = null;
  if (missionRaw) {
    try {
      const mission = JSON.parse(missionRaw) as DailyReadingMission;
      missions = { payload: mission, clientUpdatedAt: nowMs() };
    } catch {
      missions = null;
    }
  }

  return {
    mastery: {
      payload: loadMasteryState(childId) as PhonicsMasteryState,
      clientUpdatedAt: readMeta(childId, "mastery"),
    },
    fluency: {
      payload: loadFluencyState(childId),
      clientUpdatedAt: readMeta(childId, "fluency"),
    },
    stories: {
      payload: loadStoryProgressLocal(childId),
      clientUpdatedAt: readMeta(childId, "stories"),
    },
    missions,
    retention: {
      payload: retentionStateToPayload(loadRetentionState(childId)),
      clientUpdatedAt: readMeta(childId, "retention"),
    },
  };
}

function readMeta(childId: number, domain: PhonicsV3Domain): number {
  try {
    const raw = localStorage.getItem(`${META_PREFIX}${childId}`);
    if (!raw) return 0;
    const meta = JSON.parse(raw) as Partial<Record<PhonicsV3Domain, number>>;
    return meta[domain] ?? 0;
  } catch {
    return 0;
  }
}

function writeMeta(childId: number, domain: PhonicsV3Domain, ts: number): void {
  try {
    const raw = localStorage.getItem(`${META_PREFIX}${childId}`);
    const meta = raw ? (JSON.parse(raw) as Partial<Record<PhonicsV3Domain, number>>) : {};
    meta[domain] = ts;
    localStorage.setItem(`${META_PREFIX}${childId}`, JSON.stringify(meta));
  } catch {
    /* quota */
  }
}

function applyBundleToLocal(childId: number, bundle: PhonicsV3ProgressBundle): void {
  if (bundle.mastery) {
    saveMasteryState(childId, bundle.mastery.payload as PhonicsMasteryState);
    writeMeta(childId, "mastery", bundle.mastery.clientUpdatedAt);
  }
  if (bundle.fluency) {
    saveFluencyState(childId, bundle.fluency.payload as PhonicsFluencyState);
    writeMeta(childId, "fluency", bundle.fluency.clientUpdatedAt);
  }
  if (bundle.stories) {
    saveStoryProgressLocal(childId, bundle.stories.payload);
    writeMeta(childId, "stories", bundle.stories.clientUpdatedAt);
  }
  if (bundle.missions) {
    localStorage.setItem(`${MISSION_PREFIX}${childId}`, JSON.stringify(bundle.missions.payload));
    writeMeta(childId, "missions", bundle.missions.clientUpdatedAt);
  }
  if (bundle.retention) {
    saveRetentionState(childId, retentionPayloadToState(bundle.retention.payload));
    writeMeta(childId, "retention", bundle.retention.clientUpdatedAt);
  }
}

function isOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

async function fetchServerBundle(
  childId: number,
  authFetch: AuthFetchFn,
): Promise<PhonicsV3ProgressBundle | null> {
  const res = await authFetch(getApiUrl(`/api/phonics/v3/progress/${childId}`));
  if (!res.ok) return null;
  const json = (await res.json()) as { progress?: PhonicsV3ProgressBundle };
  return json.progress ?? null;
}

async function postSyncBatch(
  childId: number,
  authFetch: AuthFetchFn,
  patch: Partial<PhonicsV3ProgressBundle>,
): Promise<PhonicsV3ProgressBundle | null> {
  const body: Record<string, unknown> = { childId };
  if (patch.mastery) body.mastery = patch.mastery;
  if (patch.fluency) body.fluency = patch.fluency;
  if (patch.stories) body.stories = patch.stories;
  if (patch.missions) body.missions = patch.missions;
  if (patch.retention) body.retention = patch.retention;

  const res = await authFetch(getApiUrl("/api/phonics/v3/progress/sync"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { progress?: PhonicsV3ProgressBundle };
  return json.progress ?? null;
}

function bundleHasLocalData(bundle: PhonicsV3ProgressBundle): boolean {
  const masteryCount =
    Object.keys(bundle.mastery?.payload.words ?? {}).length +
    Object.keys(bundle.mastery?.payload.letters ?? {}).length;
  const fluencyTotal = bundle.fluency?.payload.wordsAttemptedTotal ?? 0;
  const storyCount = Object.keys(bundle.stories?.payload.completed ?? {}).length;
  const missionTasks = bundle.missions?.payload.tasks.length ?? 0;
  const retentionTracks = Object.keys(bundle.retention?.payload.tracks ?? {}).length;
  return masteryCount > 0 || fluencyTotal > 0 || storyCount > 0 || missionTasks > 0 || retentionTracks > 0;
}

function serverBundleEmpty(server: PhonicsV3ProgressBundle | null): boolean {
  if (!server) return true;
  return !bundleHasLocalData({
    mastery: server.mastery ?? { payload: defaultMasteryState(), clientUpdatedAt: 0 },
    fluency: server.fluency ?? { payload: defaultFluencyState(), clientUpdatedAt: 0 },
    stories: server.stories ?? { payload: defaultStoryProgressState(), clientUpdatedAt: 0 },
    missions: server.missions,
    retention: server.retention ?? { payload: defaultRetentionPayload(), clientUpdatedAt: 0 },
  });
}

export async function hydratePhonicsV3Progress(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<void> {
  if (authFetch) globalAuthFetch = authFetch;

  const local = bundleFromLocal(childId);
  let merged = local;

  if (authFetch && isOnline()) {
    const server = await fetchServerBundle(childId, authFetch);
    if (server) {
      if (serverBundleEmpty(server) && bundleHasLocalData(local)) {
        const uploaded = await postSyncBatch(childId, authFetch, local);
        merged = uploaded ?? local;
      } else {
        merged = mergePhonicsV3Bundle(local, server);
        // Push union back when this device has offline progress — otherwise merged
        // keys never reach the server and are lost on the next device or reinstall.
        if (bundleHasLocalData(local)) {
          const uploaded = await postSyncBatch(childId, authFetch, merged);
          merged = uploaded ?? merged;
        }
      }
      saveQueue(childId, []);
    }
  }

  applyBundleToLocal(childId, merged);
  hydratedChildren.add(childId);
}

export function queuePhonicsV3DomainSync(childId: number, domain: PhonicsV3Domain): void {
  const ts = nowMs();
  writeMeta(childId, domain, ts);
  enqueueSync(childId, domain, ts);
  void flushPhonicsV3SyncQueue(childId, globalAuthFetch ?? undefined);
}

export async function flushPhonicsV3SyncQueue(
  childId: number,
  authFetch?: AuthFetchFn | null,
): Promise<boolean> {
  const fetchFn = authFetch ?? globalAuthFetch;
  if (!fetchFn || !isOnline()) return false;

  const queue = loadQueue(childId);
  const local = bundleFromLocal(childId);
  const patch: Partial<PhonicsV3ProgressBundle> = {};

  const domains =
    queue.length > 0
      ? [...new Set(queue.map((q) => q.domain))]
      : (["mastery", "fluency", "stories", "missions", "retention"] as PhonicsV3Domain[]);

  for (const domain of domains) {
    if (domain === "mastery" && local.mastery) patch.mastery = local.mastery;
    if (domain === "fluency" && local.fluency) patch.fluency = local.fluency;
    if (domain === "stories" && local.stories) patch.stories = local.stories;
    if (domain === "missions" && local.missions) patch.missions = local.missions;
    if (domain === "retention" && local.retention) patch.retention = local.retention;
  }

  if (Object.keys(patch).length === 0) return true;

  const result = await postSyncBatch(childId, fetchFn, patch);
  if (!result) return false;

  const merged = mergePhonicsV3Bundle(local, result);
  applyBundleToLocal(childId, merged);
  saveQueue(childId, []);
  return true;
}

export function persistPhonicsV3Mastery(childId: number, state: PhonicsMasteryState): void {
  saveMasteryState(childId, state);
  queuePhonicsV3DomainSync(childId, "mastery");
}

export function persistPhonicsV3Fluency(childId: number, state: PhonicsFluencyState): void {
  saveFluencyState(childId, state);
  queuePhonicsV3DomainSync(childId, "fluency");
}

export function persistPhonicsV3Stories(childId: number, state: PhonicsStoryProgressState): void {
  saveStoryProgressLocal(childId, state);
  queuePhonicsV3DomainSync(childId, "stories");
}

export function persistPhonicsV3Mission(childId: number, mission: DailyReadingMission): void {
  localStorage.setItem(`${MISSION_PREFIX}${childId}`, JSON.stringify(mission));
  queuePhonicsV3DomainSync(childId, "missions");
}

export function persistPhonicsV3Retention(childId: number, state: PhonicsRetentionState): void {
  saveRetentionState(childId, state);
  queuePhonicsV3DomainSync(childId, "retention");
}

export function loadPhonicsV3MissionLocal(childId: number): DailyReadingMission | null {
  try {
    const raw = localStorage.getItem(`${MISSION_PREFIX}${childId}`);
    if (!raw) return null;
    return JSON.parse(raw) as DailyReadingMission;
  } catch {
    return null;
  }
}

export function ensurePhonicsV3OnlineSync(authFetch: AuthFetchFn): void {
  globalAuthFetch = authFetch;
  if (onlineListenerAttached || typeof window === "undefined") return;
  onlineListenerAttached = true;
  window.addEventListener("online", () => {
    for (const childId of hydratedChildren) {
      void flushPhonicsV3SyncQueue(childId, authFetch);
    }
  });
}

/** Test-only reset */
export function _resetPhonicsV3SyncForTests(): void {
  hydratedChildren.clear();
  onlineListenerAttached = false;
  globalAuthFetch = null;
}
