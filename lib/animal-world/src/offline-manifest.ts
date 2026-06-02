import type { Animal } from "./types.js";
import {
  collectAnimalSoundUrls,
  resolveAnimalImageUrl,
  resolveAnimalHeroImageUrl,
} from "./catalog.js";

export const ANIMAL_WORLD_OFFLINE_CACHE_VERSION = 2;

export const OFFLINE_LIMITS = {
  maxAnimals: 50,
  maxSounds: 200,
  maxImages: 80,
} as const;

export type OfflineAssetEntry = {
  url: string;
  kind: "sound" | "image";
  animalId: string;
  priority: number;
};

/** Rank animals by play count for offline prioritization. */
export function buildOfflineManifest(
  animals: Animal[],
  playCounts: Record<string, number> = {},
): OfflineAssetEntry[] {
  const ranked = [...animals].sort((a, b) => {
    const da = playCounts[a.id] ?? 0;
    const db = playCounts[b.id] ?? 0;
    return db - da;
  });

  const topAnimals = ranked.slice(0, OFFLINE_LIMITS.maxAnimals);
  const entries: OfflineAssetEntry[] = [];

  for (const animal of topAnimals) {
    const playBoost = playCounts[animal.id] ?? 0;
    entries.push({
      url: resolveAnimalImageUrl(animal),
      kind: "image",
      animalId: animal.id,
      priority: 100 + playBoost,
    });
    entries.push({
      url: resolveAnimalHeroImageUrl(animal, "real"),
      kind: "image",
      animalId: animal.id,
      priority: 90 + playBoost,
    });
    for (const [idx, soundUrl] of collectAnimalSoundUrls(animal).entries()) {
      entries.push({
        url: soundUrl,
        kind: "sound",
        animalId: animal.id,
        priority: 80 + playBoost - idx,
      });
    }
  }

  const sounds = entries.filter((e) => e.kind === "sound").slice(0, OFFLINE_LIMITS.maxSounds);
  const images = entries.filter((e) => e.kind === "image").slice(0, OFFLINE_LIMITS.maxImages);
  const merged = [...sounds, ...images];
  const seen = new Set<string>();
  return merged.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
