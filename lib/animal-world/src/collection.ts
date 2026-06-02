import type {
  Animal,
  AnimalCollectionStatus,
  AnimalMasteryRecord,
  AnimalWorldProgressV2,
  ExplorerTier,
} from "./types.js";
import { EXPLORER_TIER_XP } from "./types.js";

export const XP_REWARDS = {
  soundPlayed: 2,
  animalOpened: 5,
  quizCorrect: 8,
  hearFindCorrect: 10,
  discoverySession: 15,
  favoriteAdded: 3,
} as const;

export function defaultAnimalMastery(): AnimalMasteryRecord {
  return {
    soundsPlayed: 0,
    quizzesCorrect: 0,
    hearFindCorrect: 0,
    hearFindAttempts: 0,
  };
}

export function defaultProgressV2(): AnimalWorldProgressV2 {
  return {
    xp: 0,
    explorerTier: "none",
    animalMastery: {},
    stickersEarned: [],
    achievementsUnlocked: [],
    hearFindSessions: 0,
    hearFindCorrectTotal: 0,
    hearFindAttemptTotal: 0,
    quizCorrectTotal: 0,
    discoverySessionsCompleted: 0,
    weeklyMinutes: {},
    monthlyAnimalsOpened: {},
  };
}

export function resolveExplorerTier(xp: number): ExplorerTier {
  if (xp >= EXPLORER_TIER_XP.gold) return "gold";
  if (xp >= EXPLORER_TIER_XP.silver) return "silver";
  if (xp >= EXPLORER_TIER_XP.bronze) return "bronze";
  return "none";
}

export function addXp(progress: AnimalWorldProgressV2, amount: number): AnimalWorldProgressV2 {
  const xp = progress.xp + amount;
  return { ...progress, xp, explorerTier: resolveExplorerTier(xp) };
}

export function getAnimalMastery(
  progress: AnimalWorldProgressV2,
  animalId: string,
): AnimalMasteryRecord {
  return progress.animalMastery[animalId] ?? defaultAnimalMastery();
}

export function resolveCollectionStatus(
  progress: AnimalWorldProgressV2,
  animalId: string,
  opened: boolean,
): AnimalCollectionStatus {
  if (!opened) return "locked";
  const m = getAnimalMastery(progress, animalId);
  const hearAcc =
    m.hearFindAttempts > 0 ? m.hearFindCorrect / m.hearFindAttempts : 0;
  if (m.quizzesCorrect >= 2 && hearAcc >= 0.8 && m.soundsPlayed >= 3) {
    return "mastered";
  }
  if (m.soundsPlayed >= 1 || m.quizzesCorrect >= 1) {
    return "unlocked";
  }
  return "discovered";
}

export function bumpMastery(
  progress: AnimalWorldProgressV2,
  animalId: string,
  patch: Partial<AnimalMasteryRecord>,
): AnimalWorldProgressV2 {
  const current = getAnimalMastery(progress, animalId);
  return {
    ...progress,
    animalMastery: {
      ...progress.animalMastery,
      [animalId]: { ...current, ...patch },
    },
  };
}

export function countDiscoveredAnimals(progress: AnimalWorldProgressV2): number {
  return Object.keys(progress.animalMastery).length;
}

export function countMasteredAnimals(
  progress: AnimalWorldProgressV2,
  openedIds: Set<string>,
): number {
  return Object.keys(progress.animalMastery).filter(
    (id) => resolveCollectionStatus(progress, id, openedIds.has(id)) === "mastered",
  ).length;
}

export function isCategoryComplete(
  animals: Animal[],
  progress: AnimalWorldProgressV2,
  category: Animal["category"],
  openedIds: Set<string>,
): boolean {
  const inCategory = animals.filter((a) => a.category === category);
  if (inCategory.length === 0) return false;
  return inCategory.every(
    (a) => resolveCollectionStatus(progress, a.id, openedIds.has(a.id)) !== "locked",
  );
}
