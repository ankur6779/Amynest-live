/**
 * Phase 7 — Failure recovery layer.
 *
 * Self-heals the client when local state goes bad:
 *  - corrupted localStorage payload for the learning sync queue
 *  - stale pending entries that have been retried too long
 *  - duplicate retries clogging the queue
 *  - reward desync (queue empty but rewards pending)
 *  - network flapping (rapid online/offline transitions)
 *
 * Pure helpers + one orchestrator (`runResilienceSweep`). Does NOT call the
 * network — it only reshapes local state so the sync engine can recover on
 * the next flush.
 */

import {
  getSyncDiagnostics,
  type SyncDiagnostics,
} from "./learning-sync-engine";
import { recordTelemetry } from "./telemetry-engine";

const SYNC_STORAGE_KEY_PREFIX = "amynest:learning-sync:v1";
const LEGACY_SYNC_STORAGE_KEY = SYNC_STORAGE_KEY_PREFIX;
const REWARD_BUS_STORAGE_KEY = "amynest:reward-bus:last";

function syncStorageKeyForUser(userId: string | null | undefined): string | null {
  if (!userId || userId.length === 0) return null;
  return `${SYNC_STORAGE_KEY_PREFIX}:${userId}`;
}

const STALE_PENDING_MS = 30 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export interface ResilienceReport {
  removedCorruptedPayload: boolean;
  removedStaleEntries: number;
  removedDuplicateEntries: number;
  detectedRewardDesync: boolean;
  flapping: boolean;
  notes: string[];
}

interface PersistedSyncShape {
  queue?: Array<{
    clientId?: string;
    childId?: number;
    activityId?: string;
    section?: string;
    at?: string;
    attempts?: number;
    nextAttemptAt?: number;
  }>;
  recent?: unknown;
  diag?: unknown;
}

function readSyncStorage(userId: string | null | undefined): {
  key: string | null;
  raw: string | null;
  parsed: PersistedSyncShape | null;
  corrupt: boolean;
} {
  if (typeof window === "undefined") {
    return { key: null, raw: null, parsed: null, corrupt: false };
  }
  const key = syncStorageKeyForUser(userId);
  if (!key) return { key: null, raw: null, parsed: null, corrupt: false };
  const raw =
    window.localStorage.getItem(key) ??
    window.localStorage.getItem(LEGACY_SYNC_STORAGE_KEY);
  if (!raw) return { key, raw: null, parsed: null, corrupt: false };
  try {
    const parsed = JSON.parse(raw) as PersistedSyncShape;
    if (parsed && typeof parsed === "object") {
      return { key, raw, parsed, corrupt: false };
    }
    return { key, raw, parsed: null, corrupt: true };
  } catch {
    return { key, raw, parsed: null, corrupt: true };
  }
}

function writeSyncStorage(key: string, parsed: PersistedSyncShape): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(parsed));
  } catch {
    /* swallow */
  }
}

/** Strip queue entries that look stale or duplicated. Returns the report fields. */
function pruneStaleAndDuplicates(parsed: PersistedSyncShape): {
  removedStaleEntries: number;
  removedDuplicateEntries: number;
} {
  if (!parsed.queue || !Array.isArray(parsed.queue)) {
    return { removedStaleEntries: 0, removedDuplicateEntries: 0 };
  }
  const now = Date.now();
  let staleRemoved = 0;
  const seen = new Set<string>();
  const filtered: NonNullable<PersistedSyncShape["queue"]> = [];
  for (const item of parsed.queue) {
    if (!item || typeof item !== "object") continue;
    const itemAtMs = typeof item.at === "string" ? Date.parse(item.at) : NaN;
    const attempts = typeof item.attempts === "number" ? item.attempts : 0;
    const tooOld = Number.isFinite(itemAtMs) && now - itemAtMs > STALE_PENDING_MS;
    if (tooOld || attempts >= MAX_ATTEMPTS) {
      staleRemoved += 1;
      continue;
    }
    const clientId = typeof item.clientId === "string" ? item.clientId : null;
    if (clientId && seen.has(clientId)) continue;
    if (clientId) seen.add(clientId);
    filtered.push(item);
  }
  const duplicateRemoved =
    parsed.queue.length - filtered.length - staleRemoved;
  parsed.queue = filtered;
  return {
    removedStaleEntries: staleRemoved,
    removedDuplicateEntries: Math.max(0, duplicateRemoved),
  };
}

/** Network flapping detector — short-window online/offline transitions. */
const networkEvents: number[] = [];
const NETWORK_WINDOW_MS = 30_000;
const FLAPPING_THRESHOLD = 4;

if (typeof window !== "undefined") {
  const tick = () => {
    networkEvents.push(Date.now());
    while (networkEvents.length > 0 && Date.now() - networkEvents[0]! > NETWORK_WINDOW_MS) {
      networkEvents.shift();
    }
  };
  window.addEventListener("online", tick);
  window.addEventListener("offline", tick);
}

function isFlapping(): boolean {
  while (networkEvents.length > 0 && Date.now() - networkEvents[0]! > NETWORK_WINDOW_MS) {
    networkEvents.shift();
  }
  return networkEvents.length >= FLAPPING_THRESHOLD;
}

function checkRewardDesync(diag: SyncDiagnostics): boolean {
  if (diag.queueDepth > 0) return false;
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(REWARD_BUS_STORAGE_KEY);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as { pendingCount?: number };
    return typeof parsed.pendingCount === "number" && parsed.pendingCount > 0;
  } catch {
    return false;
  }
}

/**
 * Run a single resilience sweep. Safe to call at app boot, on `focus`, or
 * after a long network drop. Returns a report so the debug page (and
 * telemetry) can see what happened.
 */
export function runResilienceSweep(userId?: string | null): ResilienceReport {
  const notes: string[] = [];
  const report: ResilienceReport = {
    removedCorruptedPayload: false,
    removedStaleEntries: 0,
    removedDuplicateEntries: 0,
    detectedRewardDesync: false,
    flapping: isFlapping(),
    notes,
  };

  if (report.flapping) {
    notes.push("network flapping detected — backing off sync");
    recordTelemetry("offline_session", networkEvents.length, { kind: "flap" });
  }

  const { key, raw, parsed, corrupt } = readSyncStorage(userId);
  if (!key) {
    notes.push("no signed-in user — skip learning-sync prune");
    return report;
  }
  if (raw && corrupt) {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(key);
        window.localStorage.removeItem(LEGACY_SYNC_STORAGE_KEY);
      } catch {
        /* swallow */
      }
    }
    report.removedCorruptedPayload = true;
    notes.push("corrupted sync payload — cleared");
    recordTelemetry("queue_retry", 0, { reason: "corrupt_payload" });
    return report;
  }

  if (parsed) {
    const pruned = pruneStaleAndDuplicates(parsed);
    report.removedStaleEntries = pruned.removedStaleEntries;
    report.removedDuplicateEntries = pruned.removedDuplicateEntries;
    if (pruned.removedStaleEntries > 0 || pruned.removedDuplicateEntries > 0) {
      writeSyncStorage(key, parsed);
      notes.push(
        `pruned ${pruned.removedStaleEntries} stale + ${pruned.removedDuplicateEntries} dup entries`,
      );
      recordTelemetry("queue_retry", pruned.removedStaleEntries, {
        kind: "stale_prune",
      });
    }
  }

  const diag = getSyncDiagnostics();
  if (checkRewardDesync(diag)) {
    report.detectedRewardDesync = true;
    notes.push("reward bus has pending events without queue — desync");
    recordTelemetry("reward_suppressed", 1, { kind: "desync" });
  }

  return report;
}

/** Hook-friendly schedule — re-runs on focus/online. Returns latest report. */
export function startResilienceWatcher(opts?: {
  userId?: string | null;
  onReport?: (r: ResilienceReport) => void;
}): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    const r = runResilienceSweep(opts?.userId);
    opts?.onReport?.(r);
  };
  window.addEventListener("focus", handler);
  window.addEventListener("online", handler);
  // Initial sweep on boot.
  handler();
  return () => {
    window.removeEventListener("focus", handler);
    window.removeEventListener("online", handler);
  };
}
