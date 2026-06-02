import { DISCOVERY_WORLDS_REGISTRY } from "@workspace/discovery-worlds";
import { getAllAnimals } from "@workspace/animal-world";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import type { WorldId, WorldProgressV2 } from "@workspace/world-engine";
import { defaultWorldItemMastery } from "@workspace/world-engine";
import { loadAnimalWorldProgress } from "@/lib/animal-world-progress";
import { loadAnimalWorldStats } from "@/lib/animal-world-storage";
import { animalProgressToPlatform, loadDiscoveryWorldProgress } from "@/lib/discovery-worlds-progress";
import { loadDiscoveryWorldStats } from "@/lib/discovery-worlds-stats";

export const DISCOVERY_CATALOG_SIZES: Record<WorldId, number> = {
  animal_world: getAllAnimals().length,
  vehicle_world: getVehicleWorldManifest().items.length,
  nature_world: getNatureWorldManifest().items.length,
  home_sounds_world: getHomeSoundsManifest().items.length,
  instrument_world: getInstrumentWorldManifest().items.length,
};

export type UnifiedWorldRow = {
  worldId: WorldId;
  title: string;
  emoji: string;
  xp: number;
  masteryPct: number;
  playCount: number;
  stickers: number;
  achievements: number;
  mastered: boolean;
};

export type UnifiedParentInsights = {
  weeklyLearningMinutes: number;
  quizAccuracyPct: number;
  recognitionAccuracyPct: number;
  learningStreakDays: number;
  totalStickers: number;
  totalAchievements: number;
  worldsCompleted: number;
  worldsTotal: number;
  overallProgressPct: number;
  favoriteWorlds: Array<{ worldId: WorldId; title: string; emoji: string; playCount: number }>;
  mostPlayedSounds: Array<{ label: string; emoji: string; worldTitle: string; count: number }>;
  needsMorePractice: Array<{ label: string; emoji: string; worldTitle: string; accuracy: number }>;
  worldRows: UnifiedWorldRow[];
  nextStep: string;
};

function loadProgress(worldId: WorldId, childId: number): WorldProgressV2 {
  if (worldId === "animal_world") {
    return animalProgressToPlatform(loadAnimalWorldProgress(childId));
  }
  return loadDiscoveryWorldProgress(worldId, childId);
}

function playCountForWorld(worldId: WorldId, childId: number): number {
  if (worldId === "animal_world") {
    const stats = loadAnimalWorldStats(childId);
    return Object.values(stats.playCounts).reduce((a, b) => a + b, 0);
  }
  const stats = loadDiscoveryWorldStats(worldId, childId);
  return Object.values(stats.playCounts).reduce((a, b) => a + b, 0);
}

function masteryPct(progress: WorldProgressV2, catalogSize: number): number {
  if (catalogSize <= 0) return 0;
  const heard = Object.values(progress.itemMastery).filter((m) => m.soundsPlayed > 0).length;
  return Math.min(100, Math.round((heard / catalogSize) * 100));
}

export function buildUnifiedParentInsights(childId: number): UnifiedParentInsights {
  const worldRows: UnifiedWorldRow[] = [];
  let weeklyLearningMinutes = 0;
  let quizCorrect = 0;
  let hearCorrect = 0;
  let hearAttempts = 0;
  let totalStickers = 0;
  let totalAchievements = 0;
  let worldsCompleted = 0;
  let streakMax = 0;
  const favoriteCandidates: Array<{ worldId: WorldId; title: string; emoji: string; playCount: number }> = [];
  const mostPlayed: Array<{ label: string; emoji: string; worldTitle: string; count: number }> = [];
  const practiceCandidates: Array<{ label: string; emoji: string; worldTitle: string; accuracy: number }> = [];

  for (const world of DISCOVERY_WORLDS_REGISTRY) {
    const progress = loadProgress(world.worldId, childId);
    const catalogSize = DISCOVERY_CATALOG_SIZES[world.worldId];
    const pct = masteryPct(progress, catalogSize);
    const plays = playCountForWorld(world.worldId, childId);
    const mastered = pct >= 80;
    if (mastered) worldsCompleted += 1;

    weeklyLearningMinutes += Object.values(progress.weeklyMinutes).reduce((a, b) => a + b, 0);
    quizCorrect += progress.quizCorrectTotal;
    hearCorrect += progress.hearFindCorrectTotal;
    hearAttempts += progress.hearFindAttemptTotal;
    totalStickers += progress.stickersEarned.length;
    totalAchievements += progress.achievementsUnlocked.length;
    streakMax = Math.max(streakMax, progress.streakDays);

    favoriteCandidates.push({
      worldId: world.worldId,
      title: world.title,
      emoji: world.emoji,
      playCount: plays,
    });

    worldRows.push({
      worldId: world.worldId,
      title: world.title,
      emoji: world.emoji,
      xp: progress.xp,
      masteryPct: pct,
      playCount: plays,
      stickers: progress.stickersEarned.length,
      achievements: progress.achievementsUnlocked.length,
      mastered,
    });

    if (world.worldId === "animal_world") {
      const stats = loadAnimalWorldStats(childId);
      for (const [id, count] of Object.entries(stats.playCounts)) {
        const animal = getAllAnimals().find((a) => a.id === id);
        if (animal) mostPlayed.push({ label: animal.name, emoji: animal.emoji, worldTitle: world.title, count });
      }
      for (const animal of getAllAnimals()) {
        const m = progress.itemMastery[animal.id] ?? defaultWorldItemMastery();
        const attempts = m.hearFindAttempts + m.quizzesCorrect;
        if (attempts < 2) continue;
        const acc = Math.round(((m.hearFindCorrect + m.quizzesCorrect) / attempts) * 100);
        if (acc < 70) {
          practiceCandidates.push({ label: animal.name, emoji: animal.emoji, worldTitle: world.title, accuracy: acc });
        }
      }
    } else {
      const stats = loadDiscoveryWorldStats(world.worldId, childId);
      const manifest =
        world.worldId === "vehicle_world"
          ? getVehicleWorldManifest()
          : world.worldId === "nature_world"
            ? getNatureWorldManifest()
            : world.worldId === "home_sounds_world"
              ? getHomeSoundsManifest()
              : getInstrumentWorldManifest();
      for (const [id, count] of Object.entries(stats.playCounts)) {
        const item = manifest.items.find((i) => i.id === id);
        if (item) mostPlayed.push({ label: item.name, emoji: item.emoji, worldTitle: world.title, count });
      }
      for (const item of manifest.items) {
        const m = progress.itemMastery[item.id] ?? defaultWorldItemMastery();
        const attempts = m.hearFindAttempts + m.quizzesCorrect;
        if (attempts < 2) continue;
        const acc = Math.round(((m.hearFindCorrect + m.quizzesCorrect) / attempts) * 100);
        if (acc < 70) {
          practiceCandidates.push({ label: item.name, emoji: item.emoji, worldTitle: world.title, accuracy: acc });
        }
      }
    }
  }

  const favoriteWorlds = favoriteCandidates
    .filter((w) => w.playCount > 0)
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 3);

  const recognitionAccuracyPct =
    hearAttempts > 0 ? Math.round((hearCorrect / hearAttempts) * 100) : 0;
  const quizAccuracyPct = quizCorrect > 0 ? Math.min(100, Math.round((quizCorrect / Math.max(quizCorrect, 1)) * 100)) : 0;

  const worldsTotal = DISCOVERY_WORLDS_REGISTRY.length;
  const overallProgressPct = Math.round(
    worldRows.reduce((sum, r) => sum + r.masteryPct, 0) / Math.max(worldsTotal, 1),
  );

  let nextStep = "Open any world and listen to three sounds to start today's adventure.";
  if (favoriteWorlds[0] && favoriteWorlds[0].playCount > 0) {
    nextStep = `Try a quiz in ${favoriteWorlds[0].title} — recognition practice builds confidence.`;
  }
  if (practiceCandidates.length > 0) {
    nextStep = `Practice ${practiceCandidates[0]!.label} in ${practiceCandidates[0]!.worldTitle} together tonight.`;
  }
  if (worldsCompleted >= worldsTotal) {
    nextStep = "Every world is mastered — explore new sounds for fun!";
  }

  return {
    weeklyLearningMinutes,
    quizAccuracyPct,
    recognitionAccuracyPct,
    learningStreakDays: streakMax,
    totalStickers,
    totalAchievements,
    worldsCompleted,
    worldsTotal,
    overallProgressPct,
    favoriteWorlds,
    mostPlayedSounds: mostPlayed.sort((a, b) => b.count - a.count).slice(0, 8),
    needsMorePractice: practiceCandidates.sort((a, b) => a.accuracy - b.accuracy).slice(0, 6),
    worldRows,
    nextStep,
  };
}

export type DiscoveryHubTileStats = {
  overallProgressPct: number;
  worldsCompleted: number;
  worldsTotal: number;
  totalStickers: number;
  totalAchievements: number;
  learningStreakDays: number;
};

export function buildDiscoveryHubTileStats(childId: number): DiscoveryHubTileStats {
  const u = buildUnifiedParentInsights(childId);
  return {
    overallProgressPct: u.overallProgressPct,
    worldsCompleted: u.worldsCompleted,
    worldsTotal: u.worldsTotal,
    totalStickers: u.totalStickers,
    totalAchievements: u.totalAchievements,
    learningStreakDays: u.learningStreakDays,
  };
}
