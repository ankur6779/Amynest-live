import {
  PLATFORM_OFFLINE_CACHE_VERSION,
  buildPlatformOfflineManifest,
  platformOfflineCacheStorageKey,
  type WorldId,
  type WorldManifestItem,
} from "@workspace/world-engine";
import { discoveryWorldAudioManager } from "@/lib/discovery-world-audio-manager";
import { loadDiscoveryWorldStats } from "@/lib/discovery-worlds-stats";

type CacheMeta = {
  version: number;
  urls: string[];
  builtAt: number;
};

function readMeta(worldId: WorldId, childId: number): CacheMeta | null {
  try {
    const raw = localStorage.getItem(platformOfflineCacheStorageKey(worldId, childId));
    if (!raw) return null;
    return JSON.parse(raw) as CacheMeta;
  } catch {
    return null;
  }
}

function writeMeta(worldId: WorldId, childId: number, meta: CacheMeta): void {
  try {
    localStorage.setItem(platformOfflineCacheStorageKey(worldId, childId), JSON.stringify(meta));
  } catch {
    /* quota */
  }
}

async function fetchToCache(cacheName: string, url: string): Promise<void> {
  if (typeof caches === "undefined") {
    discoveryWorldAudioManager.preload([url]);
    return;
  }
  try {
    const cache = await caches.open(cacheName);
    const hit = await cache.match(url);
    if (!hit) await cache.add(url);
  } catch {
    discoveryWorldAudioManager.preload([url]);
  }
}

export async function warmDiscoveryWorldOfflineCache(input: {
  worldId: WorldId;
  childId: number;
  items: WorldManifestItem[];
  resolveSoundUrl: (gcsPath: string) => string;
  resolveImageUrl: (gcsPath: string) => string;
}): Promise<void> {
  if (typeof window === "undefined") return;
  const { worldId, childId, items, resolveSoundUrl, resolveImageUrl } = input;
  const stats = loadDiscoveryWorldStats(worldId, childId);
  const manifest = buildPlatformOfflineManifest({
    worldId,
    items,
    resolveSoundUrl,
    resolveImageUrl,
    playCounts: stats.playCounts,
  });
  const urls = manifest.map((e) => e.url);
  const cacheName = `discovery-worlds-offline-v${PLATFORM_OFFLINE_CACHE_VERSION}-${worldId}`;
  const batch = 6;
  for (let i = 0; i < urls.length; i += batch) {
    await Promise.all(urls.slice(i, i + batch).map((url) => fetchToCache(cacheName, url)));
  }
  writeMeta(worldId, childId, {
    version: PLATFORM_OFFLINE_CACHE_VERSION,
    urls,
    builtAt: Date.now(),
  });
  discoveryWorldAudioManager.preloadSmart({ current: urls.filter((u) => /\.(mp3|m4a|wav)/i.test(u)) });
}

export function needsDiscoveryOfflineRefresh(worldId: WorldId, childId: number): boolean {
  const meta = readMeta(worldId, childId);
  return !meta || meta.version < PLATFORM_OFFLINE_CACHE_VERSION;
}
