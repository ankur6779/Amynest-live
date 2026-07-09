/**
 * Shared in-memory audio element cache — populated by global warmup, consumed at playback.
 *
 * Instant-playback window (Phase 5): keep current + previous + next N clips decoded
 * (HAVE_FUTURE_DATA). Feedback / hot keys stay pinned and never leave memory.
 */

const globalAudioCache = new Map<string, HTMLAudioElement>();
const pinnedCacheKeys = new Set<string>();
/** Insertion-order ring for predictive window (current / prev / next). */
const predictiveWindow: string[] = [];
const PREDICTIVE_WINDOW_MAX = 7; // previous + current + next 5
const MEMORY_CACHE_SOFT_MAX = 120;

export function getGlobalAudioCacheEntry(cacheKey: string): HTMLAudioElement | undefined {
  return globalAudioCache.get(cacheKey);
}

export function setGlobalAudioCacheEntry(cacheKey: string, audio: HTMLAudioElement): void {
  globalAudioCache.set(cacheKey, audio);
  touchPredictiveWindow(cacheKey);
  while (globalAudioCache.size > MEMORY_CACHE_SOFT_MAX) {
    if (!evictOldestUnpinnedGlobalAudioEntry()) break;
  }
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

/**
 * Mark a clip as part of the active predictive window (current / neighbors).
 * Keeps decoded elements warm so tap never waits on decode.
 */
export function touchPredictiveWindow(cacheKey: string): void {
  const key = cacheKey.trim();
  if (!key) return;
  const idx = predictiveWindow.indexOf(key);
  if (idx >= 0) predictiveWindow.splice(idx, 1);
  predictiveWindow.push(key);
  while (predictiveWindow.length > PREDICTIVE_WINDOW_MAX) {
    predictiveWindow.shift();
  }
}

/** Pin an ordered sequence: treat first as current, rest as next clips. */
export function pinPredictiveSequence(keys: string[]): void {
  for (const raw of keys) {
    const key = raw.trim();
    if (!key) continue;
    touchPredictiveWindow(key);
    pinGlobalAudioCacheKey(key);
  }
}

export function getPredictiveWindowKeys(): readonly string[] {
  return predictiveWindow;
}

/** Pre-warmed clip ready for playback (HAVE_FUTURE_DATA or better). */
export function getGlobalCachedAudioForPlayback(cacheKey: string): HTMLAudioElement | null {
  const audio = globalAudioCache.get(cacheKey);
  if (!audio || audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) return null;
  return audio;
}

/**
 * Ensure an HTMLAudioElement is decoded enough for instant play.
 * Call on feature open — never after the user tap.
 */
export function ensureAudioPredecoded(audio: HTMLAudioElement): Promise<boolean> {
  if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("canplaythrough", onReady);
      audio.removeEventListener("loadeddata", onReady);
      audio.removeEventListener("error", onErr);
      resolve(ok);
    };
    const onReady = () => done(audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA);
    const onErr = () => done(false);
    audio.addEventListener("canplaythrough", onReady);
    audio.addEventListener("loadeddata", onReady);
    audio.addEventListener("error", onErr);
    try {
      audio.preload = "auto";
      audio.load();
    } catch {
      done(false);
      return;
    }
    window.setTimeout(() => done(audio.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA), 4_000);
  });
}

/** Evict oldest unpinned entry — used when cache exceeds limit. */
export function evictOldestUnpinnedGlobalAudioEntry(): boolean {
  for (const key of globalAudioCache.keys()) {
    if (pinnedCacheKeys.has(key)) continue;
    if (predictiveWindow.includes(key)) continue;
    globalAudioCache.delete(key);
    return true;
  }
  return false;
}

export function getGlobalAudioCacheStats(): {
  size: number;
  pinned: number;
  predictiveWindow: number;
  readyCount: number;
} {
  let readyCount = 0;
  for (const audio of globalAudioCache.values()) {
    if (audio.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) readyCount += 1;
  }
  return {
    size: globalAudioCache.size,
    pinned: pinnedCacheKeys.size,
    predictiveWindow: predictiveWindow.length,
    readyCount,
  };
}
