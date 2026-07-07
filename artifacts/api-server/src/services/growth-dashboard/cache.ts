const TTL_MS = 60_000;
const store = new Map<string, { expiresAt: number; value: unknown }>();

export function getCached<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCached(key: string, value: unknown): void {
  store.set(key, { expiresAt: Date.now() + TTL_MS, value });
  if (store.size > 200) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}

export function cacheKey(prefix: string, rangeKey: string): string {
  return `${prefix}:${rangeKey}`;
}

export function rangeKey(start: Date, end: Date): string {
  return `${start.toISOString()}|${end.toISOString()}`;
}
