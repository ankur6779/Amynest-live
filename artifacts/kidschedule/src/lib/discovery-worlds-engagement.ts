import {
  addPlatformXp,
  buildPlatformStickerCatalog,
  earnPlatformStickers,
  type PlatformStickerDefinition,
  type PlatformXpKind,
  type WorldId,
  type WorldManifestItem,
  type WorldProgressV2,
} from "@workspace/world-engine";
import {
  bumpItemMastery,
  commitDiscoveryWorldProgress,
  loadDiscoveryWorldProgress,
  saveDiscoveryWorldProgress,
  touchDiscoveryWorldStreak,
} from "@/lib/discovery-worlds-progress";
import { openedItemIds, recordDiscoverySoundPlayed } from "@/lib/discovery-worlds-stats";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function appendDiscoveryWorldSessionMs(
  worldId: WorldId,
  childId: number,
  ms: number,
): void {
  const progress = loadDiscoveryWorldProgress(worldId, childId);
  const week = todayKey();
  const minutes = Math.max(1, Math.round(ms / 60000));
  saveDiscoveryWorldProgress(worldId, childId, {
    ...progress,
    totalSessionMs: progress.totalSessionMs + ms,
    weeklyMinutes: {
      ...progress.weeklyMinutes,
      [week]: (progress.weeklyMinutes[week] ?? 0) + minutes,
    },
  });
}

export type EngagementResult = {
  progress: WorldProgressV2;
  earnedStickers: PlatformStickerDefinition[];
};

export function applyDiscoveryWorldEngagement(input: {
  worldId: WorldId;
  childId: number;
  itemId: string;
  soundId: string;
  items: WorldManifestItem[];
  xpKind?: PlatformXpKind;
  masteryPatch?: Partial<import("@workspace/world-engine").WorldItemMastery>;
}): EngagementResult {
  const { worldId, childId, itemId, soundId, items, xpKind = "soundPlayed", masteryPatch } = input;
  recordDiscoverySoundPlayed(worldId, childId, itemId, soundId);

  let progress = loadDiscoveryWorldProgress(worldId, childId);
  progress = touchDiscoveryWorldStreak(progress);
  progress = bumpItemMastery(progress, itemId, {
    soundsPlayed: (progress.itemMastery[itemId]?.soundsPlayed ?? 0) + 1,
    ...masteryPatch,
  });
  progress = addPlatformXp(progress, xpKind);

  const month = monthKey();
  progress = {
    ...progress,
    monthlyItemsOpened: {
      ...progress.monthlyItemsOpened,
      [month]: (progress.monthlyItemsOpened[month] ?? 0) + 1,
    },
  };

  const catalog = buildPlatformStickerCatalog(items);
  const stickerResult = earnPlatformStickers(progress, catalog);
  progress = stickerResult.progress;

  const opened = openedItemIds(worldId, childId);
  opened.add(itemId);
  progress = commitDiscoveryWorldProgress(worldId, childId, progress, items, opened);

  return { progress, earnedStickers: stickerResult.earned };
}

export function applyQuizEngagement(
  worldId: WorldId,
  childId: number,
  itemId: string,
  items: WorldManifestItem[],
  correct: boolean,
): EngagementResult {
  let progress = loadDiscoveryWorldProgress(worldId, childId);
  progress = touchDiscoveryWorldStreak(progress);
  if (correct) {
    progress = bumpItemMastery(progress, itemId, {
      quizzesCorrect: (progress.itemMastery[itemId]?.quizzesCorrect ?? 0) + 1,
    });
    progress = addPlatformXp(progress, "quizCorrect");
    progress = { ...progress, quizCorrectTotal: progress.quizCorrectTotal + 1 };
  }
  const catalog = buildPlatformStickerCatalog(items);
  const stickerResult = earnPlatformStickers(progress, catalog);
  progress = stickerResult.progress;
  const opened = openedItemIds(worldId, childId);
  progress = commitDiscoveryWorldProgress(worldId, childId, progress, items, opened);
  return { progress, earnedStickers: stickerResult.earned };
}

export function applyDiscoverySessionEngagement(
  worldId: WorldId,
  childId: number,
  items: WorldManifestItem[],
): EngagementResult {
  let progress = loadDiscoveryWorldProgress(worldId, childId);
  progress = touchDiscoveryWorldStreak(progress);
  progress = addPlatformXp(progress, "discoverySession");
  progress = {
    ...progress,
    discoverySessionsCompleted: progress.discoverySessionsCompleted + 1,
  };
  const catalog = buildPlatformStickerCatalog(items);
  const stickerResult = earnPlatformStickers(progress, catalog);
  progress = stickerResult.progress;
  const opened = openedItemIds(worldId, childId);
  progress = commitDiscoveryWorldProgress(worldId, childId, progress, items, opened);
  return { progress, earnedStickers: stickerResult.earned };
}
