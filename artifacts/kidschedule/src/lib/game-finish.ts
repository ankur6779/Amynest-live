/**
 * Durable game finish — never lose a completed session.
 * Mastery is always local-first; wallet sync is best-effort + idempotent.
 *
 * Pending play POSTs are stamped with the Firebase uid that earned them so a
 * shared-tablet account switch cannot flush User A's offline finishes into
 * User B's wallet (points / playLog / skills / daily limit).
 */
import { recordPlay } from "@/lib/games";
import { recordMasterySession } from "@/lib/game-mastery";
import { recordGamingPlay } from "@/lib/gaming-wallet-api";

const PENDING_KEY = "amynest_game_play_sync_queue_v1";
const MAX_QUEUE = 40;

export interface PendingPlaySync {
  gameId: string;
  score: number;
  total: number;
  idempotencyKey: string;
  queuedAt: number;
  attempts: number;
  /** Firebase uid that earned this play. Required for flush under that auth. */
  ownerUserId?: string;
}

export interface DurableFinishInput {
  gameId: string;
  score: number;
  total: number;
  perfect: boolean;
  pointsEarned: number;
  isSignedIn: boolean;
  /** Required when signed in so deferred plays cannot flush under another account. */
  userId?: string | null;
  authFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  /** Stable per finish — retries must reuse the same key. */
  idempotencyKey?: string;
}

export interface DurableFinishResult {
  pointsEarned: number;
  perfect: boolean;
  /** True when server sync failed or was deferred. */
  syncPending: boolean;
  syncError?: string;
  idempotencyKey: string;
}

/** One stable key per play session — reuse on retries, never across sessions. */
export function createPlayIdempotencyKey(gameId: string): string {
  return newIdempotencyKey(gameId);
}

function newIdempotencyKey(gameId: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `play:${gameId}:${rand}`.slice(0, 120);
}

function isLikelyOffline(): boolean {
  try {
    return typeof navigator !== "undefined" && navigator.onLine === false;
  } catch {
    return false;
  }
}

function readQueue(): PendingPlaySync[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingPlaySync[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x) =>
        x &&
        typeof x.gameId === "string" &&
        typeof x.idempotencyKey === "string" &&
        Number.isFinite(x.score) &&
        Number.isFinite(x.total),
    );
  } catch {
    return [];
  }
}

function writeQueue(queue: PendingPlaySync[]): void {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(queue.slice(-MAX_QUEUE)));
  } catch {
    /* quota — drop oldest half and retry once */
    try {
      const trimmed = queue.slice(-Math.floor(MAX_QUEUE / 2));
      localStorage.setItem(PENDING_KEY, JSON.stringify(trimmed));
    } catch {
      /* ignore */
    }
  }
}

export function enqueuePlaySync(
  item: Omit<PendingPlaySync, "queuedAt" | "attempts">,
): void {
  const queue = readQueue().filter((x) => x.idempotencyKey !== item.idempotencyKey);
  queue.push({ ...item, queuedAt: Date.now(), attempts: 0 });
  writeQueue(queue);
}

export function getPendingPlaySyncCount(): number {
  return readQueue().length;
}

/**
 * Flush pending server play records for `currentUserId` only.
 * Foreign-owned and legacy unscoped entries are never POSTed under this auth
 * (unscoped legacy is dropped to prevent shared-tablet pollution).
 * Best-effort; never throws to callers.
 */
export async function flushPendingPlaySync(
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  currentUserId?: string | null,
): Promise<{ flushed: number; remaining: number }> {
  if (isLikelyOffline()) {
    return { flushed: 0, remaining: readQueue().length };
  }

  const queue = readQueue();
  if (queue.length === 0) return { flushed: 0, remaining: 0 };

  const ownerId = typeof currentUserId === "string" ? currentUserId.trim() : "";
  if (!ownerId) {
    // Without a signed-in uid we must not attribute plays to anyone.
    return { flushed: 0, remaining: queue.length };
  }

  const remaining: PendingPlaySync[] = [];
  let flushed = 0;

  for (const item of queue) {
    const itemOwner =
      typeof item.ownerUserId === "string" ? item.ownerUserId.trim() : "";
    // Legacy unscoped entries: discard (do not POST under the wrong account).
    if (!itemOwner) continue;
    // Keep other users' deferred plays for when they sign back in.
    if (itemOwner !== ownerId) {
      remaining.push(item);
      continue;
    }

    try {
      await recordGamingPlay(authFetch, {
        gameId: item.gameId,
        score: item.score,
        total: item.total,
        idempotencyKey: item.idempotencyKey,
      });
      flushed += 1;
    } catch {
      remaining.push({ ...item, attempts: item.attempts + 1 });
    }
  }

  const next = remaining.filter((x) => x.attempts < 8);
  writeQueue(next);
  return { flushed, remaining: next.length };
}

/**
 * Record mastery immediately, then persist play locally and sync wallet best-effort.
 * Always returns a result suitable for showing the result screen.
 */
export async function durableFinishGame(
  input: DurableFinishInput,
): Promise<DurableFinishResult> {
  const { gameId, score, total, perfect } = input;
  let pointsEarned = input.pointsEarned;
  const idempotencyKey = input.idempotencyKey ?? newIdempotencyKey(gameId);
  const ownerUserId =
    typeof input.userId === "string" && input.userId.trim()
      ? input.userId.trim()
      : undefined;

  // 1) Learning progress must never depend on the network.
  recordMasterySession({
    gameId,
    score,
    total,
    frustrated: total > 0 ? score / total < 0.35 : false,
  });

  // 2) Guest path — local only.
  if (!input.isSignedIn || !input.authFetch) {
    recordPlay(gameId, score, total, perfect, pointsEarned);
    return { pointsEarned, perfect, syncPending: false, idempotencyKey };
  }

  // Signed-in finishes without a uid must not enqueue unscoped poison.
  const canQueue = Boolean(ownerUserId);

  // 3) Known offline — skip failing fetch; queue for reconnect.
  if (isLikelyOffline()) {
    recordPlay(gameId, score, total, perfect, pointsEarned);
    if (canQueue) {
      enqueuePlaySync({ gameId, score, total, idempotencyKey, ownerUserId });
    }
    return {
      pointsEarned,
      perfect,
      syncPending: true,
      syncError: "offline",
      idempotencyKey,
    };
  }

  // 4) Signed-in online — try server; on failure keep local + queue (idempotent retry).
  try {
    const out = await recordGamingPlay(input.authFetch, {
      gameId,
      score,
      total,
      idempotencyKey,
    });
    pointsEarned = out.pointsEarned;
    void flushPendingPlaySync(input.authFetch, ownerUserId);
    return {
      pointsEarned,
      perfect: out.perfect,
      syncPending: false,
      idempotencyKey,
    };
  } catch (e) {
    recordPlay(gameId, score, total, perfect, pointsEarned);
    if (canQueue) {
      enqueuePlaySync({ gameId, score, total, idempotencyKey, ownerUserId });
    }
    return {
      pointsEarned,
      perfect,
      syncPending: true,
      syncError: e instanceof Error ? e.message : "sync_failed",
      idempotencyKey,
    };
  }
}
