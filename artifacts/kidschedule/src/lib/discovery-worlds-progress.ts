import type { AnimalWorldProgressV2 } from "@workspace/animal-world";
import {
  addPlatformXp,
  defaultWorldProgressV2,
  mergePlatformAchievements,
  platformProgressStorageKey,
  type WorldId,
  type WorldManifestItem,
  type WorldProgressV2,
  type WorldItemMastery,
} from "@workspace/world-engine";
import { openedItemIds } from "@/lib/discovery-worlds-stats";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function touchDiscoveryWorldStreak(progress: WorldProgressV2): WorldProgressV2 {
  const today = todayKey();
  if (progress.lastPlayedDate === today) return progress;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);
  const streakDays =
    progress.lastPlayedDate === yesterdayKey ? progress.streakDays + 1 : 1;
  return { ...progress, streakDays, lastPlayedDate: today };
}

export function loadDiscoveryWorldProgress(
  worldId: WorldId,
  childId: number,
): WorldProgressV2 {
  if (typeof window === "undefined") return defaultWorldProgressV2(worldId);
  try {
    const raw = localStorage.getItem(platformProgressStorageKey(worldId, childId));
    if (!raw) return defaultWorldProgressV2(worldId);
    return { ...defaultWorldProgressV2(worldId), ...JSON.parse(raw) };
  } catch {
    return defaultWorldProgressV2(worldId);
  }
}

export function saveDiscoveryWorldProgress(
  worldId: WorldId,
  childId: number,
  progress: WorldProgressV2,
): void {
  try {
    localStorage.setItem(
      platformProgressStorageKey(worldId, childId),
      JSON.stringify(progress),
    );
  } catch {
    /* quota */
  }
}

export function bumpItemMastery(
  progress: WorldProgressV2,
  itemId: string,
  patch: Partial<WorldItemMastery>,
): WorldProgressV2 {
  const current = progress.itemMastery[itemId] ?? {
    soundsPlayed: 0,
    quizzesCorrect: 0,
    hearFindCorrect: 0,
    hearFindAttempts: 0,
  };
  return {
    ...progress,
    itemMastery: { ...progress.itemMastery, [itemId]: { ...current, ...patch } },
  };
}

export function commitDiscoveryWorldProgress(
  worldId: WorldId,
  childId: number,
  progress: WorldProgressV2,
  items: WorldManifestItem[],
  openedIds: Set<string>,
): WorldProgressV2 {
  const merged = mergePlatformAchievements(worldId, progress, items, openedIds);
  saveDiscoveryWorldProgress(worldId, childId, merged);
  return merged;
}

export function grantDiscoveryWorldXp(
  worldId: WorldId,
  childId: number,
  kind: Parameters<typeof addPlatformXp>[1],
): WorldProgressV2 {
  const progress = addPlatformXp(loadDiscoveryWorldProgress(worldId, childId), kind);
  saveDiscoveryWorldProgress(worldId, childId, progress);
  return progress;
}

export function recordHearFindAttempt(
  worldId: WorldId,
  childId: number,
  itemId: string,
  correct: boolean,
  items: WorldManifestItem[],
): WorldProgressV2 {
  let progress = loadDiscoveryWorldProgress(worldId, childId);
  progress = touchDiscoveryWorldStreak(progress);
  progress = bumpItemMastery(progress, itemId, {
    hearFindAttempts: (progress.itemMastery[itemId]?.hearFindAttempts ?? 0) + 1,
    hearFindCorrect: (progress.itemMastery[itemId]?.hearFindCorrect ?? 0) + (correct ? 1 : 0),
  });
  progress = {
    ...progress,
    hearFindAttemptTotal: progress.hearFindAttemptTotal + 1,
    hearFindCorrectTotal: progress.hearFindCorrectTotal + (correct ? 1 : 0),
  };
  if (correct) progress = addPlatformXp(progress, "hearFindCorrect");
  progress = commitDiscoveryWorldProgress(
    worldId,
    childId,
    progress,
    items,
    openedItemIds(worldId, childId),
  );
  return progress;
}

/** Read-only mirror for cross-world parent hub (Animal World keys untouched). */
export function animalProgressToPlatform(progress: AnimalWorldProgressV2): WorldProgressV2 {
  return {
    worldId: "animal_world",
    xp: progress.xp,
    explorerTier: progress.explorerTier,
    itemMastery: Object.fromEntries(
      Object.entries(progress.animalMastery).map(([id, m]) => [id, { ...m }]),
    ),
    stickersEarned: [...progress.stickersEarned],
    achievementsUnlocked: [...progress.achievementsUnlocked],
    hearFindSessions: progress.hearFindSessions,
    hearFindCorrectTotal: progress.hearFindCorrectTotal,
    hearFindAttemptTotal: progress.hearFindAttemptTotal,
    quizCorrectTotal: progress.quizCorrectTotal,
    discoverySessionsCompleted: progress.discoverySessionsCompleted,
    weeklyMinutes: { ...progress.weeklyMinutes },
    monthlyItemsOpened: { ...progress.monthlyAnimalsOpened },
    favorites: [],
    totalSessionMs: 0,
    streakDays: 0,
    lastPlayedDate: null,
  };
}
