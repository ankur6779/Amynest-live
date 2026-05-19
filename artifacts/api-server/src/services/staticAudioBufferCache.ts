/** In-memory LRU for static MP3 bytes — avoids repeat GCS reads under load. */

const MAX_ENTRIES = Number(process.env.STATIC_AUDIO_MEMORY_CACHE_MAX ?? "100");

type CacheEntry = {
  buffer: Buffer;
  byteLength: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<Buffer | null>>();

let memoryHits = 0;
let memoryMisses = 0;

function touch(hash: string, entry: CacheEntry): void {
  cache.delete(hash);
  cache.set(hash, entry);
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value as string;
    cache.delete(oldest);
    console.log("[LRU EVICT]", oldest);
  }
}

export function hasCachedStaticAudioBuffer(hash: string): boolean {
  return cache.has(hash);
}

export function getCachedStaticAudioBuffer(hash: string): Buffer | null {
  const entry = cache.get(hash);
  if (!entry) {
    memoryMisses += 1;
    return null;
  }
  memoryHits += 1;
  touch(hash, entry);
  return entry.buffer;
}

export function setCachedStaticAudioBuffer(hash: string, buffer: Buffer): void {
  if (!buffer.byteLength) return;
  touch(hash, { buffer, byteLength: buffer.byteLength });
}

export function getInflightStaticAudioLoad(
  hash: string,
): Promise<Buffer | null> | undefined {
  return inflight.get(hash);
}

export function setInflightStaticAudioLoad(
  hash: string,
  promise: Promise<Buffer | null>,
): void {
  inflight.set(hash, promise);
  void promise.finally(() => {
    if (inflight.get(hash) === promise) inflight.delete(hash);
  });
}

export function getMemoryCacheStats(): {
  size: number;
  maxEntries: number;
  hits: number;
  misses: number;
  hitRate: number;
} {
  const lookups = memoryHits + memoryMisses;
  return {
    size: cache.size,
    maxEntries: MAX_ENTRIES,
    hits: memoryHits,
    misses: memoryMisses,
    hitRate: lookups > 0 ? Number((memoryHits / lookups).toFixed(4)) : 0,
  };
}

export function resetStaticAudioBufferCacheForTests(): void {
  cache.clear();
  inflight.clear();
  memoryHits = 0;
  memoryMisses = 0;
}
