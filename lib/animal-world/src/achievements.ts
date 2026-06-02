import type { AchievementDefinition, AchievementProgress, AnimalWorldProgressV2 } from "./types.js";
import { hearFindAccuracyPct } from "./hear-find-engine.js";
import { countDiscoveredAnimals, isCategoryComplete } from "./collection.js";
import type { Animal, AnimalCategory } from "./types.js";
import { ANIMAL_CATEGORIES } from "./types.js";

export const ANIMAL_WORLD_ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "animal_explorer",
    title: "Animal Explorer",
    description: "Listen to 10 different animals",
    emoji: "🧭",
    target: 10,
    metric: "unique_animals_heard",
  },
  {
    id: "farm_master",
    title: "Farm Master",
    description: "Discover every farm animal",
    emoji: "🌾",
    target: 1,
    metric: "category_complete",
  },
  {
    id: "sea_explorer",
    title: "Sea Explorer",
    description: "Discover every sea animal",
    emoji: "🌊",
    target: 1,
    metric: "category_complete",
  },
  {
    id: "quiz_champion",
    title: "Quiz Champion",
    description: "20 correct quiz answers",
    emoji: "🏆",
    target: 20,
    metric: "quiz_correct_total",
  },
  {
    id: "sound_detective",
    title: "Sound Detective",
    description: "95% hear-and-find accuracy",
    emoji: "🔍",
    target: 95,
    metric: "hear_find_accuracy_pct",
  },
  {
    id: "discovery_star",
    title: "Discovery Star",
    description: "Complete 5 discovery sessions",
    emoji: "✨",
    target: 5,
    metric: "discovery_sessions",
  },
];

const CATEGORY_ACHIEVEMENT_MAP: Partial<Record<string, AnimalCategory>> = {
  farm_master: "farm",
  sea_explorer: "sea",
};

function metricCurrent(
  def: AchievementDefinition,
  progress: AnimalWorldProgressV2,
  animals: Animal[],
  openedIds: Set<string>,
): number {
  switch (def.metric) {
    case "unique_animals_heard":
      return countDiscoveredAnimals(progress);
    case "category_complete": {
      const cat = CATEGORY_ACHIEVEMENT_MAP[def.id];
      if (!cat) return 0;
      return isCategoryComplete(animals, progress, cat, openedIds) ? 1 : 0;
    }
    case "quiz_correct_total":
      return progress.quizCorrectTotal;
    case "hear_find_accuracy_pct":
      return hearFindAccuracyPct(
        progress.hearFindCorrectTotal,
        progress.hearFindAttemptTotal,
      );
    case "discovery_sessions":
      return progress.discoverySessionsCompleted;
    default:
      return 0;
  }
}

export function computeAchievementProgress(
  progress: AnimalWorldProgressV2,
  animals: Animal[],
  openedIds: Set<string>,
): AchievementProgress[] {
  return ANIMAL_WORLD_ACHIEVEMENTS.map((definition) => {
    const current = metricCurrent(definition, progress, animals, openedIds);
    const unlocked =
      progress.achievementsUnlocked.includes(definition.id) ||
      current >= definition.target;
    return { definition, current, unlocked };
  });
}

export function newlyUnlockedAchievements(
  before: AnimalWorldProgressV2,
  after: AnimalWorldProgressV2,
  animals: Animal[],
  openedIds: Set<string>,
): AchievementDefinition[] {
  const prev = new Set(before.achievementsUnlocked);
  return computeAchievementProgress(after, animals, openedIds)
    .filter((row) => row.unlocked && !prev.has(row.definition.id))
    .map((row) => row.definition);
}

export function mergeUnlockedAchievements(
  progress: AnimalWorldProgressV2,
  animals: Animal[],
  openedIds: Set<string>,
): AnimalWorldProgressV2 {
  const unlocked = computeAchievementProgress(progress, animals, openedIds)
    .filter((row) => row.unlocked)
    .map((row) => row.definition.id);
  return {
    ...progress,
    achievementsUnlocked: [...new Set([...progress.achievementsUnlocked, ...unlocked])],
  };
}

export function listAchievementCategories(): AnimalCategory[] {
  return [...ANIMAL_CATEGORIES];
}
