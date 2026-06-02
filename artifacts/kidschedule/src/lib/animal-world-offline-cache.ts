import {
  ANIMAL_WORLD_OFFLINE_CACHE_VERSION,
  buildOfflineManifest,
  getAllAnimals,
  type OfflineAssetEntry,
} from "@workspace/animal-world";
import { loadAnimalWorldStats } from "@/lib/animal-world-storage";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";

const CACHE_META_KEY = "amynest:animal-world:offline:v2";

type CacheMeta = {
  version: number;
  urls: string[];
  builtAt: number;
};

function readMeta(): CacheMeta | null {
  try {
    const raw = localStorage.getItem(CACHE_META_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CacheMeta;
  } catch {
    return null;
  }
}

function writeMeta(meta: CacheMeta): void {
  try {
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch {
    /* quota */
  }
}

export function getOfflineCacheVersion(): number {
  return readMeta()?.version ?? 0;
}

export function needsOfflineCacheRefresh(): boolean {
  const meta = readMeta();
  return !meta || meta.version < ANIMAL_WORLD_OFFLINE_CACHE_VERSION;
}

async function fetchToCache(url: string): Promise<void> {
  if (typeof caches === "undefined") {
    animalAudioManager.preload([url]);
    return;
  }
  try {
    const cache = await caches.open(`animal-world-offline-v${ANIMAL_WORLD_OFFLINE_CACHE_VERSION}`);
    const hit = await cache.match(url);
    if (!hit) await cache.add(url);
  } catch {
    animalAudioManager.preload([url]);
  }
}

export async function warmAnimalWorldOfflineCache(childId: number): Promise<void> {
  if (typeof window === "undefined") return;
  const stats = loadAnimalWorldStats(childId);
  const manifest: OfflineAssetEntry[] = buildOfflineManifest(
    getAllAnimals(),
    stats.playCounts,
  );
  const urls = manifest.map((e) => e.url);
  const batch = 6;
  for (let i = 0; i < urls.length; i += batch) {
    await Promise.all(urls.slice(i, i + batch).map((url) => fetchToCache(url)));
  }
  writeMeta({
    version: ANIMAL_WORLD_OFFLINE_CACHE_VERSION,
    urls,
    builtAt: Date.now(),
  });
  animalAudioManager.preload(urls.filter((u) => u.endsWith(".mp3") || u.includes(".mp3")));
}

export async function playOfflineFirst(url: string): Promise<boolean> {
  if (typeof caches === "undefined") return false;
  try {
    const cache = await caches.open(`animal-world-offline-v${ANIMAL_WORLD_OFFLINE_CACHE_VERSION}`);
    const hit = await cache.match(url);
    return Boolean(hit);
  } catch {
    return false;
  }
}
