import { DISCOVERY_WORLDS_REGISTRY } from "@workspace/discovery-worlds";
import type { WorldId, WorldProgressV2 } from "@workspace/world-engine";
import { loadDiscoveryWorldProgress } from "@/lib/discovery-worlds-progress";
import { loadAnimalWorldProgress } from "@/lib/animal-world-progress";
import { animalProgressToPlatform } from "@/lib/discovery-worlds-progress";

export type WorldMapDestinationState = "locked" | "unlocked" | "mastered";

export type WorldMapDestination = {
  worldId: WorldId;
  title: string;
  emoji: string;
  routePath: string;
  state: WorldMapDestinationState;
  masteryPct: number;
  xp: number;
};

function masteryPct(progress: WorldProgressV2, catalogSize: number): number {
  if (catalogSize <= 0) return 0;
  const heard = Object.values(progress.itemMastery).filter((m) => m.soundsPlayed > 0).length;
  return Math.min(100, Math.round((heard / catalogSize) * 100));
}

export function loadWorldMapDestinations(
  childId: number,
  catalogSizes: Partial<Record<WorldId, number>>,
  gateLocked: (hubModuleGate: string) => boolean,
): WorldMapDestination[] {
  return DISCOVERY_WORLDS_REGISTRY.map((world) => {
    const size = catalogSizes[world.worldId] ?? 10;
    const progress =
      world.worldId === "animal_world"
        ? animalProgressToPlatform(loadAnimalWorldProgress(childId))
        : loadDiscoveryWorldProgress(world.worldId, childId);
    const pct = masteryPct(progress, size);
    const locked = gateLocked(world.hubModuleGate);
    let state: WorldMapDestinationState = "unlocked";
    if (locked) state = "locked";
    else if (pct >= 80) state = "mastered";
    return {
      worldId: world.worldId,
      title: world.title,
      emoji: world.emoji,
      routePath: world.routePath,
      state,
      masteryPct: pct,
      xp: progress.xp,
    };
  });
}

export function aggregateDiscoveryStreak(childId: number): number {
  let max = 0;
  for (const world of DISCOVERY_WORLDS_REGISTRY) {
    const progress =
      world.worldId === "animal_world"
        ? animalProgressToPlatform(loadAnimalWorldProgress(childId))
        : loadDiscoveryWorldProgress(world.worldId, childId);
    max = Math.max(max, progress.streakDays);
  }
  return max;
}
