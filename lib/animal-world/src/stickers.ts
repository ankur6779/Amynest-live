import type { Animal, AnimalMasteryRecord, AnimalWorldProgressV2, StickerDefinition } from "./types.js";
import { getAnimalMastery } from "./collection.js";

/** Sticker catalog — one sticker per featured animal with simple unlock rules. */
export function buildStickerCatalog(animals: Animal[]): StickerDefinition[] {
  const featured = animals.slice(0, Math.min(animals.length, 24));
  return featured.map((animal) => ({
    id: `sticker:${animal.id}`,
    animalId: animal.id,
    title: `${animal.name} Sticker`,
    emoji: animal.emoji,
    unlockRule: { type: "sounds_played" as const, count: 3 },
  }));
}

export function isStickerUnlocked(
  sticker: StickerDefinition,
  progress: AnimalWorldProgressV2,
): boolean {
  if (progress.stickersEarned.includes(sticker.id)) return true;
  const mastery = getAnimalMastery(progress, sticker.animalId);
  return meetsStickerRule(sticker, mastery, progress);
}

function meetsStickerRule(
  sticker: StickerDefinition,
  mastery: AnimalMasteryRecord,
  progress: AnimalWorldProgressV2,
): boolean {
  switch (sticker.unlockRule.type) {
    case "sounds_played":
      return mastery.soundsPlayed >= sticker.unlockRule.count;
    case "quiz_correct":
      return mastery.quizzesCorrect >= sticker.unlockRule.count;
    case "discovery_complete":
      return progress.discoverySessionsCompleted >= 1;
    default:
      return false;
  }
}

export function earnEligibleStickers(
  progress: AnimalWorldProgressV2,
  catalog: StickerDefinition[],
): { progress: AnimalWorldProgressV2; earned: StickerDefinition[] } {
  const earned: StickerDefinition[] = [];
  const nextEarned = [...progress.stickersEarned];
  for (const sticker of catalog) {
    if (nextEarned.includes(sticker.id)) continue;
    if (isStickerUnlocked(sticker, progress)) {
      nextEarned.push(sticker.id);
      earned.push(sticker);
    }
  }
  return {
    progress: { ...progress, stickersEarned: nextEarned },
    earned,
  };
}
