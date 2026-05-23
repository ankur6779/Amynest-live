import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY_PREFIX = "OFFLINE_QUEUE";

export type QueuedActionType =
  | "COMPLETE_ROUTINE"
  | "UNDO_ROUTINE"
  | "COMPLETE_COACH_STEP"
  | "UPDATE_BEHAVIOR";

export type QueuedAction = {
  id: string;
  type: QueuedActionType;
  payload: Record<string, unknown>;
  timestamp: number;
  attempts: number;
  lastError?: string;
  userId: string | null;
};

let currentUserId: string | null = null;
export function setQueueUserId(userId: string | null): void {
  currentUserId = userId;
}
export function getQueueUserId(): string | null {
  return currentUserId;
}
function keyFor(userId: string | null): string {
  return `${QUEUE_KEY_PREFIX}:${userId ?? "anon"}`;
}

// Single-writer mutex for AsyncStorage queue mutations to prevent
// read-modify-write races between submit/drain/foreground/auto triggers.
let mutexChain: Promise<unknown> = Promise.resolve();
function withQueueLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = mutexChain.then(() => fn(), () => fn());
  // ensure chain continues even on rejection
  mutexChain = next.catch(() => undefined);
  return next;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readQueueRaw(userId: string | null): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedAction[]) : [];
  } catch {
    return [];
  }
}

async function writeQueueRaw(userId: string | null, queue: QueuedAction[]): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(queue));
  } catch {
    // best effort
  }
}

export function readQueue(userId?: string | null): Promise<QueuedAction[]> {
  return withQueueLock(() => readQueueRaw(userId ?? currentUserId));
}

export function writeQueue(queue: QueuedAction[], userId?: string | null): Promise<void> {
  return withQueueLock(() => writeQueueRaw(userId ?? currentUserId, queue));
}

export function enqueueAction(
  type: QueuedActionType,
  payload: Record<string, unknown>,
): Promise<QueuedAction> {
  return withQueueLock(async () => {
    const userId = currentUserId;
    const queue = await readQueueRaw(userId);
    const action: QueuedAction = {
      id: uid(),
      type,
      payload,
      timestamp: Date.now(),
      attempts: 0,
      userId,
    };
    queue.push(action);
    await writeQueueRaw(userId, queue);
    return action;
  });
}

/**
 * Atomic drain: snapshot the current queue under lock, hand it to the
 * processor, then merge the processor's "remaining" with any actions that
 * were enqueued during the drain window so we never lose new submissions.
 */
export function drainQueue(
  process: (snapshot: QueuedAction[]) => Promise<QueuedAction[]>,
): Promise<{ processed: number; remaining: number }> {
  return withQueueLock(async () => {
    const userId = currentUserId;
    const before = await readQueueRaw(userId);
    if (before.length === 0) return { processed: 0, remaining: 0 };
    // Take ownership of the in-flight snapshot, leaving any new arrivals
    // (added after the lock was released by the caller's awaits inside
    // `process`) safe — we re-read after processing and merge.
    const snapshotIds = new Set(before.map((a) => a.id));
    const stillRemaining = await process(before);
    const after = await readQueueRaw(userId);
    const newArrivals = after.filter((a) => !snapshotIds.has(a.id));
    const merged = [...stillRemaining, ...newArrivals];
    await writeQueueRaw(userId, merged);
    return { processed: before.length, remaining: stillRemaining.length };
  });
}

export function clearQueue(userId?: string | null): Promise<void> {
  return withQueueLock(async () => {
    try {
      if (typeof userId !== "undefined") {
        await AsyncStorage.removeItem(keyFor(userId));
        return;
      }
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k.startsWith(`${QUEUE_KEY_PREFIX}:`));
      if (toRemove.length > 0) await AsyncStorage.multiRemove(toRemove);
    } catch {
      // ignore
    }
  });
}

export function queueLength(): Promise<number> {
  return readQueue().then((q) => q.length);
}
