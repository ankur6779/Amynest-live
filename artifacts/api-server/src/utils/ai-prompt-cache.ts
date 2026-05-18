import { createHash } from "node:crypto";

const MAX_ENTRIES = Number(process.env.AI_PROMPT_CACHE_SIZE ?? "200");
const TTL_MS = Number(process.env.AI_PROMPT_CACHE_TTL_MS ?? String(15 * 60_000));

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

function prune(): void {
  const now = Date.now();
  for (const [k, v] of store) {
    if (v.expiresAt <= now) store.delete(k);
  }
  while (store.size > MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
}

export function promptCacheKey(namespace: string, payload: unknown): string {
  const raw = JSON.stringify(payload);
  return createHash("sha256").update(`${namespace}\0${raw}`).digest("hex");
}

export function getPromptCache<T>(key: string): T | undefined {
  const row = store.get(key);
  if (!row) return undefined;
  if (row.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }
  return row.value as T;
}

export function setPromptCache<T>(key: string, value: T): void {
  prune();
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function clearPromptCache(): void {
  store.clear();
}
