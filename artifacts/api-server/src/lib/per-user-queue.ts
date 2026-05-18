/**
 * Serializes async work per user so concurrent AI requests do not stack
 * (OpenAI rate limits, memory spikes, duplicate generations).
 */
const queues = new Map<string, Promise<unknown>>();

export async function enqueueForUser<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const key = userId.trim() || "anonymous";
  const prev = queues.get(key) ?? Promise.resolve();

  const next = prev
    .then(() => task())
    .catch((err) => {
      throw err;
    })
    .finally(() => {
      if (queues.get(key) === next) queues.delete(key);
    });

  queues.set(key, next);
  return next as Promise<T>;
}

/** Test helper */
export function clearUserQueues(): void {
  queues.clear();
}
