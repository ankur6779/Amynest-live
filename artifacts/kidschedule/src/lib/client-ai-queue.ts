/**
 * One in-flight Amy AI routine generation per user (prevents double-tap spam).
 */
const queues = new Map<string, Promise<unknown>>();

export async function enqueueClientAi<T>(userId: string, task: () => Promise<T>): Promise<T> {
  const key = userId.trim() || "guest";
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
