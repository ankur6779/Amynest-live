import type { WorldId } from "./types.js";
import type { WorldManifestItem } from "./manifest-types.js";
import type { WorldProgressV2 } from "./progress-types.js";

export type PlatformAchievementMetric =
  | "unique_items_heard"
  | "category_complete"
  | "quiz_correct_total"
  | "hear_find_accuracy_pct"
  | "discovery_sessions";

export type PlatformAchievementDefinition = {
  id: string;
  worldId: WorldId;
  title: string;
  description: string;
  emoji: string;
  target: number;
  metric: PlatformAchievementMetric;
  /** For category_complete achievements */
  categoryId?: string;
};

export type PlatformAchievementProgress = {
  definition: PlatformAchievementDefinition;
  current: number;
  unlocked: boolean;
};

export const PLATFORM_WORLD_ACHIEVEMENTS: PlatformAchievementDefinition[] = [
  {
    id: "animal_world_explorer",
    worldId: "animal_world",
    title: "Animal Explorer",
    description: "Discover animals in Animal World",
    emoji: "🐾",
    target: 10,
    metric: "unique_items_heard",
  },
  {
    id: "animal_expert",
    worldId: "animal_world",
    title: "Animal Expert",
    description: "Master listening in Animal World",
    emoji: "🦁",
    target: 95,
    metric: "hear_find_accuracy_pct",
  },
  {
    id: "vehicle_master",
    worldId: "vehicle_world",
    title: "Vehicle Master",
    description: "Discover road and air vehicles",
    emoji: "🚗",
    target: 8,
    metric: "unique_items_heard",
  },
  {
    id: "nature_listener",
    worldId: "nature_world",
    title: "Nature Listener",
    description: "Explore nature sounds",
    emoji: "🌧️",
    target: 6,
    metric: "unique_items_heard",
  },
  {
    id: "home_helper",
    worldId: "home_sounds_world",
    title: "Home Helper",
    description: "Recognize home sounds",
    emoji: "🏠",
    target: 6,
    metric: "unique_items_heard",
  },
  {
    id: "music_explorer",
    worldId: "instrument_world",
    title: "Music Explorer",
    description: "Hear many instruments",
    emoji: "🎵",
    target: 6,
    metric: "unique_items_heard",
  },
];

function hearFindAccuracyPct(correct: number, attempts: number): number {
  if (attempts <= 0) return 0;
  return Math.round((correct / attempts) * 100);
}

function metricValue(
  def: PlatformAchievementDefinition,
  progress: WorldProgressV2,
  items: WorldManifestItem[],
  openedIds: Set<string>,
): number {
  switch (def.metric) {
    case "unique_items_heard":
      return Object.keys(progress.itemMastery).length;
    case "category_complete": {
      if (!def.categoryId) return 0;
      const inCat = items.filter((i) => i.category === def.categoryId);
      if (inCat.length === 0) return 0;
      return inCat.every((i) => openedIds.has(i.id)) ? 1 : 0;
    }
    case "quiz_correct_total":
      return progress.quizCorrectTotal;
    case "hear_find_accuracy_pct":
      return hearFindAccuracyPct(progress.hearFindCorrectTotal, progress.hearFindAttemptTotal);
    case "discovery_sessions":
      return progress.discoverySessionsCompleted;
    default:
      return 0;
  }
}

export function computePlatformAchievements(
  worldId: WorldId,
  progress: WorldProgressV2,
  items: WorldManifestItem[],
  openedIds: Set<string>,
): PlatformAchievementProgress[] {
  return PLATFORM_WORLD_ACHIEVEMENTS.filter((d) => d.worldId === worldId).map((definition) => {
    const current = metricValue(definition, progress, items, openedIds);
    const unlocked =
      progress.achievementsUnlocked.includes(definition.id) || current >= definition.target;
    return { definition, current, unlocked };
  });
}

export function mergePlatformAchievements(
  worldId: WorldId,
  progress: WorldProgressV2,
  items: WorldManifestItem[],
  openedIds: Set<string>,
): WorldProgressV2 {
  const unlocked = computePlatformAchievements(worldId, progress, items, openedIds)
    .filter((row) => row.unlocked)
    .map((row) => row.definition.id);
  return {
    ...progress,
    achievementsUnlocked: [...new Set([...progress.achievementsUnlocked, ...unlocked])],
  };
}
