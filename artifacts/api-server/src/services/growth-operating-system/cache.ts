const TTL_MS = 45_000;
const store = new Map<string, { expiresAt: number; value: unknown }>();

export function getCacheKey(
  section: string,
  range: { start: Date; end: Date },
  extra: Record<string, string | undefined>,
): string {
  const parts = Object.entries(extra)
    .filter(([, v]) => v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  return `${section}:${range.start.toISOString()}:${range.end.toISOString()}:${parts}`;
}

export function getCachedSection<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

export function setCachedSection(key: string, value: unknown): void {
  store.set(key, { expiresAt: Date.now() + TTL_MS, value });
  if (store.size > 300) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
}
