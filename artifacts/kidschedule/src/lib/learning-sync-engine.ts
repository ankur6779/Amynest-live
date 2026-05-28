/**
 * Phase 6 — Learning Sync Engine (client).
 *
 * A small, durable queue for learning activity completions that:
 *   - debounces duplicate taps (anti-spam)
 *   - dedupes pending submissions
 *   - retries with exponential backoff
 *   - persists across reloads in localStorage
 *   - drains automatically when the browser regains connectivity
 *
 * IMPORTANT: This is the ONE place client-side that talks to the
 * learning-progress write endpoints. UI code should call
 * `enqueueLearningActivity()` and forget — the server remains the
 * single authority for XP / mastery / rewards.
 */

import {
  isLikelyDuplicateTap,
  type RecentActivityEvent,
  type SectionKey,
  type RewardEvent,
} from "@workspace/learning-progress-engine";

const STORAGE_KEY = "amynest:learning-sync:v1";
const MAX_QUEUE = 50;
const MAX_RECENT_CACHE = 80;
const BASE_RETRY_MS = 1500;
const MAX_RETRY_MS = 60_000;

export interface PendingActivity {
  /** Stable client id — used for dedup. */
  clientId: string;
  childId: number;
  activityId: string;
  section: SectionKey;
  correct: boolean;
  /** Wall-clock ISO when the user completed the activity. */
  at: string;
  attempts: number;
  nextAttemptAt: number;
}

export interface SyncDiagnostics {
  queueDepth: number;
  pendingClientIds: string[];
  lastFlushAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  recentDuplicatesSuppressed: number;
}

type Listener = (diag: SyncDiagnostics) => void;
type Fetcher = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

interface PostResult {
  rewardEvents?: RewardEvent[];
}

interface QueueState {
  queue: PendingActivity[];
  recent: RecentActivityEvent[];
  diag: SyncDiagnostics;
}

function emptyState(): QueueState {
  return {
    queue: [],
    recent: [],
    diag: {
      queueDepth: 0,
      pendingClientIds: [],
      lastFlushAt: null,
      lastErrorAt: null,
      lastError: null,
      recentDuplicatesSuppressed: 0,
    },
  };
}

function loadState(): QueueState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<QueueState>;
    return {
      queue: Array.isArray(parsed.queue) ? parsed.queue.slice(0, MAX_QUEUE) : [],
      recent: Array.isArray(parsed.recent)
        ? parsed.recent.slice(0, MAX_RECENT_CACHE)
        : [],
      diag: { ...emptyState().diag, ...(parsed.diag ?? {}) },
    };
  } catch {
    return emptyState();
  }
}

function persistState(state: QueueState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        queue: state.queue,
        recent: state.recent.slice(-MAX_RECENT_CACHE),
        diag: state.diag,
      }),
    );
  } catch {
    /* quota — drop oldest and retry once */
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          queue: state.queue.slice(-10),
          recent: state.recent.slice(-20),
          diag: state.diag,
        }),
      );
    } catch {
      /* give up silently */
    }
  }
}

let state: QueueState = loadState();
const listeners = new Set<Listener>();
let fetcher: Fetcher | null = null;
let apiUrlFn: (path: string) => string = (p) => p;
let onRewards: ((events: RewardEvent[]) => void) | null = null;
let flushScheduled = false;
let flushTimer: number | null = null;
let inFlight: Set<string> = new Set();

function notify(): void {
  state.diag.queueDepth = state.queue.length;
  state.diag.pendingClientIds = state.queue.map((q) => q.clientId);
  for (const l of listeners) l(state.diag);
}

function save(): void {
  persistState(state);
  notify();
}

export function configureLearningSync(opts: {
  fetcher: Fetcher;
  getApiUrl?: (path: string) => string;
  onRewards?: (events: RewardEvent[]) => void;
}): void {
  fetcher = opts.fetcher;
  if (opts.getApiUrl) apiUrlFn = opts.getApiUrl;
  onRewards = opts.onRewards ?? null;
  scheduleFlush(50);
}

export function subscribeLearningSync(listener: Listener): () => void {
  listeners.add(listener);
  listener(state.diag);
  return () => listeners.delete(listener);
}

export function getSyncDiagnostics(): SyncDiagnostics {
  return state.diag;
}

export function clearLearningSyncForTests(): void {
  state = emptyState();
  inFlight = new Set();
  if (flushTimer != null && typeof window !== "undefined") {
    window.clearTimeout(flushTimer);
  }
  flushTimer = null;
  flushScheduled = false;
  save();
}

function makeClientId(activityId: string, at: string): string {
  return `${activityId}@${at}`;
}

function alreadyQueued(clientId: string): boolean {
  return state.queue.some((q) => q.clientId === clientId);
}

/**
 * Public API — enqueue a completion. Returns false when suppressed
 * (duplicate tap within cooldown) so the caller can avoid playing
 * reward animations again.
 */
export function enqueueLearningActivity(input: {
  childId: number;
  activityId: string;
  section: SectionKey;
  correct?: boolean;
  at?: string;
}): boolean {
  const at = input.at ?? new Date().toISOString();
  if (isLikelyDuplicateTap(input.activityId, state.recent, at)) {
    state.diag.recentDuplicatesSuppressed += 1;
    save();
    return false;
  }

  const clientId = makeClientId(input.activityId, at);
  if (alreadyQueued(clientId)) {
    return false;
  }

  const item: PendingActivity = {
    clientId,
    childId: input.childId,
    activityId: input.activityId,
    section: input.section,
    correct: input.correct ?? true,
    at,
    attempts: 0,
    nextAttemptAt: Date.now(),
  };

  state.queue.push(item);
  if (state.queue.length > MAX_QUEUE) {
    state.queue.splice(0, state.queue.length - MAX_QUEUE);
  }
  state.recent.push({
    activityId: input.activityId,
    section: input.section,
    correct: item.correct,
    at,
  });
  if (state.recent.length > MAX_RECENT_CACHE) {
    state.recent.splice(0, state.recent.length - MAX_RECENT_CACHE);
  }
  save();
  scheduleFlush(0);
  return true;
}

function backoff(attempts: number): number {
  const ms = BASE_RETRY_MS * 2 ** Math.min(attempts, 5);
  return Math.min(MAX_RETRY_MS, ms);
}

function scheduleFlush(delay: number): void {
  if (typeof window === "undefined" || !fetcher) return;
  if (flushScheduled) return;
  flushScheduled = true;
  flushTimer = window.setTimeout(() => {
    flushScheduled = false;
    void flushQueue();
  }, delay);
}

async function postOne(item: PendingActivity): Promise<PostResult> {
  if (!fetcher) throw new Error("learning-sync_not_configured");
  const res = await fetcher(apiUrlFn("/api/learning-progress/complete-activity"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Learning-Sync-Client-Id": item.clientId,
    },
    body: JSON.stringify({
      childId: item.childId,
      activityId: item.activityId,
      section: item.section,
      correct: item.correct,
      clientId: item.clientId,
      occurredAt: item.at,
    }),
  });
  if (!res.ok) {
    throw new Error(`learning-sync_http_${res.status}`);
  }
  return (await res.json()) as PostResult;
}

async function flushQueue(): Promise<void> {
  if (!fetcher) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    scheduleFlush(5000);
    return;
  }
  const now = Date.now();
  const due = state.queue.filter(
    (q) => !inFlight.has(q.clientId) && q.nextAttemptAt <= now,
  );
  if (due.length === 0) {
    const next = state.queue
      .filter((q) => !inFlight.has(q.clientId))
      .reduce<number | null>(
        (acc, q) => (acc == null ? q.nextAttemptAt : Math.min(acc, q.nextAttemptAt)),
        null,
      );
    if (next != null) scheduleFlush(Math.max(50, next - now));
    return;
  }

  for (const item of due) {
    inFlight.add(item.clientId);
    try {
      const result = await postOne(item);
      state.queue = state.queue.filter((q) => q.clientId !== item.clientId);
      state.diag.lastFlushAt = new Date().toISOString();
      if (result.rewardEvents?.length && onRewards) {
        onRewards(result.rewardEvents);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const next = state.queue.find((q) => q.clientId === item.clientId);
      if (next) {
        next.attempts += 1;
        next.nextAttemptAt = Date.now() + backoff(next.attempts);
        // Give up after 8 attempts (~ couple of minutes) to avoid infinite retry.
        if (next.attempts >= 8) {
          state.queue = state.queue.filter((q) => q.clientId !== next.clientId);
        }
      }
      state.diag.lastErrorAt = new Date().toISOString();
      state.diag.lastError = message;
    } finally {
      inFlight.delete(item.clientId);
    }
  }

  save();

  if (state.queue.length > 0) {
    const next = Math.min(...state.queue.map((q) => q.nextAttemptAt));
    scheduleFlush(Math.max(250, next - Date.now()));
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => scheduleFlush(100));
  window.addEventListener("focus", () => scheduleFlush(100));
}
