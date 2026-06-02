import {
  collectAdjacentAnimalUrls,
  collectAnimalSoundUrls,
  collectCategoryPreloadUrls,
  collectLikelyDiscoveryUrls,
  collectLikelyQuizSoundUrls,
  getAllAnimals,
  type Animal,
  type AnimalCategory,
} from "@workspace/animal-world";
import { animalAudioManager } from "@/lib/animal-world-audio-manager";

let warmed = false;

export function warmAnimalWorldOnOpen(category?: AnimalCategory): void {
  if (typeof window === "undefined") return;
  const animals = getAllAnimals();
  const current = category
    ? collectCategoryPreloadUrls(category, 6)
    : animals.slice(0, 4).flatMap((animal) => collectAnimalSoundUrls(animal).slice(0, 1));
  animalAudioManager.preloadSmart({
    current,
    quiz: collectLikelyQuizSoundUrls(animals, 8),
    discovery: collectLikelyDiscoveryUrls(animals, 6),
  });
  warmed = true;
}

export function warmAnimalDetail(animal: Animal): void {
  const animals = getAllAnimals();
  animalAudioManager.preloadSmart({
    current: collectAnimalSoundUrls(animal),
    adjacent: collectAdjacentAnimalUrls(animals, animal.id),
    quiz: collectLikelyQuizSoundUrls(animals, 4),
  });
}

export function isAnimalWorldWarmed(): boolean {
  return warmed;
}
