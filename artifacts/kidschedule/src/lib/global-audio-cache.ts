/**
 * Shared in-memory audio element cache — populated by global warmup, consumed at playback.
 */

const globalAudioCache = new Map<string, HTMLAudioElement>();

export function getGlobalAudioCacheEntry(cacheKey: string): HTMLAudioElement | undefined {
  return globalAudioCache.get(cacheKey);
}

export function setGlobalAudioCacheEntry(cacheKey: string, audio: HTMLAudioElement): void {
  globalAudioCache.set(cacheKey, audio);
}

export function deleteGlobalAudioCacheEntry(cacheKey: string): void {
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

/** Pre-warmed clip ready for playback (HAVE_FUTURE_DATA or better). */
export function getGlobalCachedAudioForPlayback(cacheKey: string): HTMLAudioElement | null {
  const audio = globalAudioCache.get(cacheKey);
  if (!audio || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return null;
  return audio;
}
