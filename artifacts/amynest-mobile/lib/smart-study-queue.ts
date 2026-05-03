// Offline-friendly queue for `/api/smart-study/attempt` writes.
//
// Mobile users frequently complete a Practice/Test session on the bus or
// in patchy school Wi-Fi. Rather than dropping those attempts (which
// would silently break tomorrow's adaptive plan), we persist each attempt
// to AsyncStorage immediately and drain the queue against the API the
// next time the screen mounts (or right after a successful flush).

import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "amynest:smart-study:attempt-queue";

export interface QueuedAttempt {
  childId: number;
  subject: string;
  topicId: string;
  correct: boolean;
  /** Client-side timestamp so the server window stays accurate even if
   *  the attempt is replayed minutes/hours later. */
  ts: string;
  /** Best-effort dedupe key for the rare case the same attempt is
   *  enqueued twice (double-tap, retry races). */
  id: string;
}

async function readQueue(): Promise<QueuedAttempt[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((q): q is QueuedAttempt =>
      q && typeof q === "object"
      && typeof q.childId === "number"
      && typeof q.subject === "string"
      && typeof q.topicId === "string"
      && typeof q.correct === "boolean"
      && typeof q.ts === "string"
      && typeof q.id === "string",
    );
  } catch {
    return [];
  }
}

async function writeQueue(queue: QueuedAttempt[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch { /* best-effort */ }
}

/** Push a new attempt onto the persistent queue. Caller should then
 *  invoke `flushAttemptQueue` to attempt immediate delivery. */
export async function enqueueAttempt(item: Omit<QueuedAttempt, "id" | "ts"> & { ts?: string }): Promise<void> {
  const queue = await readQueue();
  // Cap the queue so a long-offline device doesn't grow it unbounded.
  // 100 attempts is generous — 5 sessions × ~20 questions.
  const trimmed = queue.length >= 100 ? queue.slice(queue.length - 99) : queue;
  trimmed.push({
    ...item,
    ts: item.ts ?? new Date().toISOString(),
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  });
  await writeQueue(trimmed);
}

/** Drain the persistent queue against the server. Items that succeed
 *  are removed; items that fail (network/5xx) stay queued for the next
 *  flush. Returns the number of attempts successfully delivered. */
export async function flushAttemptQueue(
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<number> {
  const queue = await readQueue();
  if (queue.length === 0) return 0;

  const remaining: QueuedAttempt[] = [];
  let delivered = 0;
  for (const item of queue) {
    try {
      const r = await authFetch("/api/smart-study/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: item.childId,
          subject: item.subject,
          topicId: item.topicId,
          correct: item.correct,
        }),
      });
      if (r.ok) {
        delivered += 1;
        continue;
      }
      // 4xx (bad payload, unknown subject, child not found) is a permanent
      // failure for this item — drop it so we don't loop forever.
      if (r.status >= 400 && r.status < 500) continue;
      remaining.push(item);
    } catch {
      // Network error → keep the item for the next flush attempt.
      remaining.push(item);
    }
  }
  await writeQueue(remaining);
  return delivered;
}
