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
 *  flush. Per-question attempts are grouped per (childId+subject) and
 *  posted as a batched array so a 20-question session is one round trip
 *  instead of twenty. Returns the number of attempts delivered. */
export async function flushAttemptQueue(
  authFetch: (path: string, init?: RequestInit) => Promise<Response>,
): Promise<number> {
  const queue = await readQueue();
  if (queue.length === 0) return 0;

  // Group consecutive items per childId. The server requires a single
  // childId per request; subject grouping happens server-side so we can
  // bundle multiple subjects in one batch.
  const batches = new Map<number, QueuedAttempt[]>();
  for (const item of queue) {
    const list = batches.get(item.childId) ?? [];
    list.push(item);
    batches.set(item.childId, list);
  }

  const remaining: QueuedAttempt[] = [];
  let delivered = 0;
  for (const [, items] of batches) {
    // Server caps a single request at MAX_BATCH attempts. After a long
    // offline streak the per-child queue can exceed that, so split into
    // chunks before posting — sending more would 400-out and a naïve
    // 4xx-drop would silently lose dozens of legitimate attempts.
    for (let off = 0; off < items.length; off += MAX_BATCH) {
      const chunk = items.slice(off, off + MAX_BATCH);
      try {
        const r = await authFetch("/api/smart-study/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chunk.map((i) => ({
            childId: i.childId,
            subject: i.subject,
            topicId: i.topicId,
            correct: i.correct,
            ts: i.ts,
          }))),
        });
        if (r.ok) {
          delivered += chunk.length;
          continue;
        }
        // 4xx (bad payload, unknown subject, child not found) is a
        // permanent failure for this chunk — drop it so we don't loop
        // forever. Chunks are bounded by MAX_BATCH so this can never
        // discard more than that many records at once.
        if (r.status >= 400 && r.status < 500) continue;
        remaining.push(...chunk);
      } catch {
        // Network error → keep the chunk for the next flush attempt.
        remaining.push(...chunk);
      }
    }
  }
  await writeQueue(remaining);
  return delivered;
}

/** Server cap on a single batched POST. Keep in sync with the route's
 *  Zod schema (`SingleAttempt[]`.max(50)). */
export const MAX_BATCH = 50;
