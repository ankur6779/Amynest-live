/**
 * Central bridge: Animal World localStorage → platform WorldProgressV2 for hub stats.
 * Animal keys remain the source of truth; this is read-only for aggregation.
 */

import type { WorldProgressV2 } from "@workspace/world-engine";
import { loadAnimalWorldProgress } from "@/lib/animal-world-progress";
import { loadAnimalWorldStats, loadLegacyFavorites } from "@/lib/animal-world-storage";
import { animalProgressToPlatform } from "@/lib/discovery-worlds-progress";

export function loadAnimalProgressAsPlatform(childId: number): WorldProgressV2 {
  const progress = loadAnimalWorldProgress(childId);
  const stats = loadAnimalWorldStats(childId);
  const legacy = loadLegacyFavorites(childId);
  const favorites = [...new Set([...stats.favorites, ...legacy])];
  return animalProgressToPlatform(progress, {
    favorites,
    totalSessionMs: stats.totalSessionMs,
    streakDays: stats.streakDays,
    lastPlayedDate: stats.lastPlayedDate,
  });
}
