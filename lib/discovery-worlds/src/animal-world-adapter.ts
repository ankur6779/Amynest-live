/**
 * Read-only bridge: Animal World (reference implementation) → platform manifest types.
 * Does not modify Animal World runtime behavior or storage keys.
 */

import {
  getAllAnimals,
  getAnimalWorldCatalog,
  resolveAnimalAssetUrl,
  type Animal,
} from "@workspace/animal-world";
import type { WorldManifest, WorldManifestItem, WorldItemBase } from "@workspace/world-engine";
import { getWorldManifestGcsPath } from "@workspace/world-engine";
import { WorldEngine } from "@workspace/world-engine";
import { modesForWorld } from "@workspace/world-engine";

export function animalToManifestItem(animal: Animal): WorldManifestItem {
  return {
    id: animal.id,
    name: animal.name,
    category: animal.category,
    emoji: animal.emoji,
    imageGcsPath: animal.imageGcsPath,
    heroRealGcsPath: animal.heroRealGcsPath,
    heroCartoonGcsPath: animal.heroCartoonGcsPath,
    funFact: animal.funFact,
    sounds: animal.sounds,
    narration: animal.narration,
    quizSoundId: animal.quizSoundId,
    quizPrompt: animal.quizPrompt,
  };
}

export function getAnimalWorldPlatformManifest(): WorldManifest {
  const catalog = getAnimalWorldCatalog();
  return {
    version: catalog.version,
    worldId: "animal_world",
    manifestPath: getWorldManifestGcsPath("animal_world"),
    categories: [],
    items: catalog.animals.map(animalToManifestItem),
  };
}

let engine: WorldEngine<WorldItemBase> | null = null;

/** Platform engine view of Animal World — for hub / cross-world parent dashboard only. */
export function getAnimalWorldPlatformEngine(): WorldEngine<WorldItemBase> {
  if (!engine) {
    const manifest = getAnimalWorldPlatformManifest();
    engine = new WorldEngine({
      worldId: "animal_world",
      catalog: {
        version: manifest.version,
        worldId: "animal_world",
        items: manifest.items.map((item) => ({
          id: item.id,
          name: item.name,
          emoji: item.emoji,
          category: item.category,
        })),
      },
      modes: modesForWorld("animal_world"),
      getItemById: (id) => {
        const full = manifest.items.find((i) => i.id === id);
        if (!full) return undefined;
        return {
          id: full.id,
          name: full.name,
          emoji: full.emoji,
          category: full.category,
        };
      },
    });
  }
  return engine;
}

export function resolveAnimalWorldPlatformSoundUrl(gcsPath: string): string {
  return resolveAnimalAssetUrl(gcsPath);
}

export function getAnimalWorldPlatformItems(): WorldManifestItem[] {
  return getAllAnimals().map(animalToManifestItem);
}
