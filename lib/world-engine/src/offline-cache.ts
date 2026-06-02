import type { WorldId } from "./types.js";
import type { WorldManifestItem } from "./manifest-types.js";

export const PLATFORM_OFFLINE_CACHE_VERSION = 1;

export const PLATFORM_OFFLINE_LIMITS = {
  maxItems: 50,
  maxSounds: 200,
  maxImages: 80,
} as const;

export type PlatformOfflineEntry = {
  url: string;
  kind: "sound" | "image";
  itemId: string;
  priority: number;
};

export type OfflineCacheBuildInput = {
  worldId: WorldId;
  items: WorldManifestItem[];
  resolveSoundUrl: (gcsPath: string) => string;
  resolveImageUrl: (gcsPath: string) => string;
  playCounts?: Record<string, number>;
};

export function buildPlatformOfflineManifest(input: OfflineCacheBuildInput): PlatformOfflineEntry[] {
  const { items, resolveSoundUrl, resolveImageUrl, playCounts = {} } = input;
  const ranked = [...items].sort(
    (a, b) => (playCounts[b.id] ?? 0) - (playCounts[a.id] ?? 0),
  );
  const top = ranked.slice(0, PLATFORM_OFFLINE_LIMITS.maxItems);
  const entries: PlatformOfflineEntry[] = [];

  for (const item of top) {
    const boost = playCounts[item.id] ?? 0;
    entries.push({
      url: resolveImageUrl(item.imageGcsPath),
      kind: "image",
      itemId: item.id,
      priority: 100 + boost,
    });
    if (item.heroRealGcsPath) {
      entries.push({
        url: resolveImageUrl(item.heroRealGcsPath),
        kind: "image",
        itemId: item.id,
        priority: 90 + boost,
      });
    }
    for (const [idx, sound] of item.sounds.entries()) {
      entries.push({
        url: resolveSoundUrl(sound.gcsPath),
        kind: "sound",
        itemId: item.id,
        priority: 80 + boost - idx,
      });
    }
    entries.push({
      url: resolveSoundUrl(item.narration.introGcsPath),
      kind: "sound",
      itemId: item.id,
      priority: 70 + boost,
    });
  }

  const sounds = entries.filter((e) => e.kind === "sound").slice(0, PLATFORM_OFFLINE_LIMITS.maxSounds);
  const images = entries.filter((e) => e.kind === "image").slice(0, PLATFORM_OFFLINE_LIMITS.maxImages);
  const seen = new Set<string>();
  return [...sounds, ...images].filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}

export function platformOfflineCacheStorageKey(worldId: WorldId, childId: number): string {
  return `amynest:discovery-worlds:offline:v${PLATFORM_OFFLINE_CACHE_VERSION}:${worldId}:${childId}`;
}

export function platformProgressStorageKey(worldId: WorldId, childId: number): string {
  return `amynest:discovery-worlds:progress:v2:${worldId}:${childId}`;
}
