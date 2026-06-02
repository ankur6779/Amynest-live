import {
  addXp,
  bumpMastery,
  defaultProgressV2,
  mergeUnlockedAchievements,
  XP_REWARDS,
  type AnimalWorldProgressV2,
} from "@workspace/animal-world";
import { getAllAnimals } from "@workspace/animal-world";
import { loadAnimalWorldStats } from "@/lib/animal-world-storage";

const PROGRESS_KEY = "amynest:animal-world:progress:v2";

type StoredProgress = Record<string, AnimalWorldProgressV2>;

function readStore(): StoredProgress {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") as StoredProgress;
  } catch {
    return {};
  }
}

function writeStore(store: StoredProgress): void {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(store));
  } catch {
    /* quota */
  }
}

function childKey(childId: number): string {
  return String(childId);
}

export function loadAnimalWorldProgress(childId: number): AnimalWorldProgressV2 {
  const store = readStore();
  return store[childKey(childId)] ?? defaultProgressV2();
}

export function saveAnimalWorldProgress(
  childId: number,
  progress: AnimalWorldProgressV2,
): void {
  const store = readStore();
  store[childKey(childId)] = progress;
  writeStore(store);
}

function openedIds(childId: number): Set<string> {
  const stats = loadAnimalWorldStats(childId);
  return new Set(Object.keys(stats.playCounts));
}

export function commitProgress(
  childId: number,
  progress: AnimalWorldProgressV2,
): AnimalWorldProgressV2 {
  const merged = mergeUnlockedAchievements(
    progress,
    getAllAnimals(),
    openedIds(childId),
  );
  saveAnimalWorldProgress(childId, merged);
  return merged;
}

export function grantXp(
  childId: number,
  kind: keyof typeof XP_REWARDS,
  masteryPatch?: { animalId: string; patch: Partial<import("@workspace/animal-world").AnimalMasteryRecord> },
): AnimalWorldProgressV2 {
  let progress = loadAnimalWorldProgress(childId);
  progress = addXp(progress, XP_REWARDS[kind]);
  if (kind === "quizCorrect") {
    progress = { ...progress, quizCorrectTotal: progress.quizCorrectTotal + 1 };
  }
  if (kind === "discoverySession") {
    progress = {
      ...progress,
      discoverySessionsCompleted: progress.discoverySessionsCompleted + 1,
    };
  }
  if (masteryPatch) {
    progress = bumpMastery(progress, masteryPatch.animalId, masteryPatch.patch);
  }
  return commitProgress(childId, progress);
}

export function recordWeeklyMinute(childId: number, minutes: number): void {
  const progress = loadAnimalWorldProgress(childId);
  const week = new Date().toISOString().slice(0, 10);
  const next = {
    ...progress,
    weeklyMinutes: {
      ...progress.weeklyMinutes,
      [week]: (progress.weeklyMinutes[week] ?? 0) + minutes,
    },
  };
  saveAnimalWorldProgress(childId, next);
}

export function recordMonthlyOpen(childId: number): void {
  const progress = loadAnimalWorldProgress(childId);
  const month = new Date().toISOString().slice(0, 7);
  const next = {
    ...progress,
    monthlyAnimalsOpened: {
      ...progress.monthlyAnimalsOpened,
      [month]: (progress.monthlyAnimalsOpened[month] ?? 0) + 1,
    },
  };
  saveAnimalWorldProgress(childId, next);
}

export function recordHearFindAttempt(
  childId: number,
  animalId: string,
  correct: boolean,
): AnimalWorldProgressV2 {
  let progress = loadAnimalWorldProgress(childId);
  progress = bumpMastery(progress, animalId, {
    hearFindAttempts: (progress.animalMastery[animalId]?.hearFindAttempts ?? 0) + 1,
    hearFindCorrect:
      (progress.animalMastery[animalId]?.hearFindCorrect ?? 0) + (correct ? 1 : 0),
  });
  progress = {
    ...progress,
    hearFindAttemptTotal: progress.hearFindAttemptTotal + 1,
    hearFindCorrectTotal: progress.hearFindCorrectTotal + (correct ? 1 : 0),
    hearFindSessions: progress.hearFindSessions + (correct ? 1 : 0),
  };
  if (correct) {
    progress = addXp(progress, XP_REWARDS.hearFindCorrect);
  }
  return commitProgress(childId, progress);
}
