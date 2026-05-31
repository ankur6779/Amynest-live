/**
 * Shared in-memory audio element cache — populated by global warmup, consumed at playback.
 */

const globalAudioCache = new Map<string, HTMLAudioElement>();
const pinnedCacheKeys = new Set<string>();

export function getGlobalAudioCacheEntry(cacheKey: string): HTMLAudioElement | undefined {
  return globalAudioCache.get(cacheKey);
}

export function setGlobalAudioCacheEntry(cacheKey: string, audio: HTMLAudioElement): void {
  globalAudioCache.set(cacheKey, audio);
}

export function deleteGlobalAudioCacheEntry(cacheKey: string): void {
  if (pinnedCacheKeys.has(cacheKey)) return;
  globalAudioCache.delete(cacheKey);
}

export function hasGlobalAudioCacheEntry(cacheKey: string): boolean {
  return globalAudioCache.has(cacheKey);
}

export function globalAudioCacheKeys(): IterableIterator<string> {
  return globalAudioCache.keys();
}

export function globalAudioCacheSize(): number {
  return globalAudioCache.size;
}

/** Pin hot Learning Zone / coach clips — skip LRU eviction. */
export function pinGlobalAudioCacheKey(cacheKey: string): void {
  pinnedCacheKeys.add(cacheKey);
}

export function isGlobalAudioCachePinned(cacheKey: string): boolean {
  return pinnedCacheKeys.has(cacheKey);
}

export function unpinGlobalAudioCacheKey(cacheKey: string): void {
  pinnedCacheKeys.delete(cacheKey);
}

/** Pre-warmed clip ready for playback (HAVE_FUTURE_DATA or better). */
export function getGlobalCachedAudioForPlayback(cacheKey: string): HTMLAudioElement | null {
  const audio = globalAudioCache.get(cacheKey);
  if (!audio || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return null;
  return audio;
}

/** Evict oldest unpinned entry — used when cache exceeds limit. */
export function evictOldestUnpinnedGlobalAudioEntry(): boolean {
  for (const key of globalAudioCache.keys()) {
    if (pinnedCacheKeys.has(key)) continue;
    globalAudioCache.delete(key);
    return true;
  }
  return false;
}
