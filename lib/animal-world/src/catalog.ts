import catalogJson from "./animals.json";
import type {
  Animal,
  AnimalCategory,
  AnimalHeroVariant,
  AnimalWorldCatalog,
  AnimalSound,
} from "./types.js";
import {
  animalWorldLibraryProxyPath,
  getAnimalHeroCartoonGcsPath,
  getAnimalHeroRealGcsPath,
} from "./gcs-paths.js";

const catalog = catalogJson as AnimalWorldCatalog;

export const ANIMAL_WORLD_CATALOG_VERSION = catalog.version;

export const CATEGORY_LABELS: Record<AnimalCategory, string> = {
  farm: "Farm Animals",
  wild: "Wild Animals",
  sea: "Sea Animals",
  birds: "Birds",
  insects: "Insects",
  pets: "Pets",
  jungle: "Jungle Animals",
  arctic: "Arctic Animals",
};

export const CATEGORY_EMOJI: Record<AnimalCategory, string> = {
  farm: "🌾",
  wild: "🦁",
  sea: "🌊",
  birds: "🪶",
  insects: "🐛",
  pets: "🏠",
  jungle: "🌴",
  arctic: "❄️",
};

const animalsById = new Map<string, Animal>(
  catalog.animals.map((animal) => [animal.id, animal]),
);

export function getAnimalWorldCatalog(): AnimalWorldCatalog {
  return catalog;
}

export function getAllAnimals(): Animal[] {
  return catalog.animals;
}

export function getAnimalById(id: string): Animal | undefined {
  return animalsById.get(id);
}

export function getAnimalsByCategory(category: AnimalCategory): Animal[] {
  return catalog.animals.filter((animal) => animal.category === category);
}

export function getAnimalSound(animal: Animal, soundId: string): AnimalSound | undefined {
  return animal.sounds.find((sound) => sound.id === soundId);
}

export function getPrimaryQuizSound(animal: Animal): AnimalSound | undefined {
  return getAnimalSound(animal, animal.quizSoundId) ?? animal.sounds[0];
}

/** Resolve a GCS path to a same-origin proxy URL for playback. */
export function resolveAnimalAssetUrl(gcsPath: string): string {
  return animalWorldLibraryProxyPath(gcsPath);
}

export function resolveAnimalImageUrl(animal: Animal): string {
  return resolveAnimalAssetUrl(animal.imageGcsPath);
}

/** Real vs cartoon hero — graceful fallback to imageGcsPath / generated paths. */
export function resolveAnimalHeroImageUrl(
  animal: Animal,
  variant: AnimalHeroVariant = "cartoon",
): string {
  if (variant === "real") {
    const path =
      animal.heroRealGcsPath ??
      getAnimalHeroRealGcsPath(animal.category, animal.id);
    return resolveAnimalAssetUrl(path);
  }
  const path =
    animal.heroCartoonGcsPath ??
    animal.imageGcsPath ??
    getAnimalHeroCartoonGcsPath(animal.category, animal.id);
  return resolveAnimalAssetUrl(path);
}

export function collectLikelyQuizSoundUrls(animals: Animal[], limit = 12): string[] {
  return animals
    .filter((a) => getPrimaryQuizSound(a))
    .slice(0, limit)
    .map((a) => resolveAnimalSoundUrl(getPrimaryQuizSound(a)!));
}

export function collectLikelyDiscoveryUrls(animals: Animal[], limit = 16): string[] {
  const urls: string[] = [];
  for (const animal of animals.slice(0, limit)) {
    const sound = getPrimaryQuizSound(animal);
    if (sound) urls.push(resolveAnimalSoundUrl(sound));
    urls.push(resolveAnimalAssetUrl(animal.narration.introGcsPath));
  }
  return urls;
}

export function collectAdjacentAnimalUrls(
  animals: Animal[],
  currentId: string,
): string[] {
  const index = animals.findIndex((a) => a.id === currentId);
  if (index < 0) return [];
  const neighbors = [animals[index - 1], animals[index + 1]].filter(Boolean) as Animal[];
  return neighbors.flatMap((a) => collectAnimalSoundUrls(a).slice(0, 2));
}

export function resolveAnimalSoundUrl(sound: AnimalSound): string {
  return resolveAnimalAssetUrl(sound.gcsPath);
}

export function collectAnimalSoundUrls(animal: Animal): string[] {
  const urls = animal.sounds.map((sound) => resolveAnimalSoundUrl(sound));
  urls.push(resolveAnimalAssetUrl(animal.narration.introGcsPath));
  urls.push(resolveAnimalAssetUrl(animal.narration.soundCueGcsPath));
  return urls;
}

export function collectCategoryPreloadUrls(category: AnimalCategory, limit = 12): string[] {
  return getAnimalsByCategory(category)
    .slice(0, limit)
    .flatMap((animal) => collectAnimalSoundUrls(animal).slice(0, 2));
}
