import {
  collectAnimalSoundUrls,
  collectCategoryPreloadUrls,
  getAllAnimals,
  type Animal,
  type AnimalCategory,
} from "@workspace/animal-world";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";

let warmed = false;

export function warmAnimalWorldOnOpen(category?: AnimalCategory): void {
  if (typeof window === "undefined") return;
  const urls = category
    ? collectCategoryPreloadUrls(category, 6)
    : getAllAnimals()
        .slice(0, 4)
        .flatMap((animal) => collectAnimalSoundUrls(animal).slice(0, 1));
  animalAudioManager.preload(urls);
  warmed = true;
}

export function warmAnimalDetail(animal: Animal): void {
  animalAudioManager.preload(collectAnimalSoundUrls(animal));
}

export function isAnimalWorldWarmed(): boolean {
  return warmed;
}
