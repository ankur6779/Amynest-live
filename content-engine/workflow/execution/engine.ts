/**
 * Run async tasks with a fixed concurrency limit.
 * Sequential when concurrency === 1; parallel otherwise.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const limit = Math.max(1, concurrency);
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function run(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index]!, index);
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => run());
  await Promise.all(runners);
  return results;
}

export async function runSequential<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  return mapWithConcurrency(items, 1, worker);
}
