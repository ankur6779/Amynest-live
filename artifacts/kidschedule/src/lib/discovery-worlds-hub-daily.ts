/**
 * Hub-level "Today's adventure" — dynamic tasks across all Discovery Worlds.
 * Storage key is additive; per-world daily keys remain unchanged.
 */

import { getAllAnimals } from "@workspace/animal-world";
import { getAnimalWorldPlatformManifest } from "@workspace/discovery-worlds";
import { getVehicleWorldManifest } from "@workspace/vehicle-world";
import { getNatureWorldManifest } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest } from "@workspace/instrument-world";
import {
  buildHubDailyAdventure,
  dailyAdventureCompletionPct,
  hubDailyAdventureCompletedCount,
  loadHubDailyAdventureProgress,
  recordHubDailyAdventureEvent,
  type DailyAdventureTaskKind,
  type HubDailyAdventureProgress,
  type HubWorldCatalog,
  type WorldId,
} from "@workspace/world-engine";
import { DISCOVERY_WORLDS_REGISTRY } from "@workspace/discovery-worlds";
import { notifyHubDailySaved } from "@/lib/discovery-worlds-progress-sync";

const HUB_DAILY_KEY_PREFIX = "amynest:discovery-worlds:hub-daily:v1";

export function hubDailyAdventureStorageKey(childId: number): string {
  return `${HUB_DAILY_KEY_PREFIX}:${childId}`;
}

export function getHubWorldCatalogs(): HubWorldCatalog[] {
  const manifests: Partial<Record<WorldId, HubWorldCatalog["items"]>> = {
    animal_world: getAnimalWorldPlatformManifest().items,
    vehicle_world: getVehicleWorldManifest().items,
    nature_world: getNatureWorldManifest().items,
    home_sounds_world: getHomeSoundsManifest().items,
    instrument_world: getInstrumentWorldManifest().items,
  };

  // Ensure animal catalog is never empty if platform manifest fails unexpectedly.
  if (!manifests.animal_world?.length) {
    manifests.animal_world = getAllAnimals().map((a) => ({
      id: a.id,
      name: a.name,
      category: a.category,
      emoji: a.emoji,
      imageGcsPath: a.imageGcsPath,
      sounds: a.sounds,
      narration: a.narration,
      quizSoundId: a.quizSoundId,
      quizPrompt: a.quizPrompt,
    }));
  }

  return DISCOVERY_WORLDS_REGISTRY.filter((w) => w.status === "live").map((world) => ({
    worldId: world.worldId,
    title: world.title,
    emoji: world.emoji,
    items: manifests[world.worldId] ?? [],
  }));
}

function readHubDaily(childId: number): HubDailyAdventureProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(hubDailyAdventureStorageKey(childId));
    return raw ? (JSON.parse(raw) as HubDailyAdventureProgress) : null;
  } catch {
    return null;
  }
}

function writeHubDaily(childId: number, progress: HubDailyAdventureProgress): void {
  try {
    localStorage.setItem(hubDailyAdventureStorageKey(childId), JSON.stringify(progress));
    notifyHubDailySaved(childId, progress);
  } catch {
    /* quota */
  }
}

export function loadHubDailyAdventure(childId: number): HubDailyAdventureProgress {
  const worlds = getHubWorldCatalogs();
  const stored = readHubDaily(childId);
  const progress = loadHubDailyAdventureProgress(stored, childId, worlds);
  // Persist freshly generated day so subsequent reads share the same task set.
  if (!stored || stored.dateKey !== progress.dateKey) {
    writeHubDaily(childId, progress);
  }
  return progress;
}

export function recordHubDailyAdventure(
  childId: number,
  worldId: WorldId,
  kind: DailyAdventureTaskKind,
  amount = 1,
): HubDailyAdventureProgress {
  const current = loadHubDailyAdventure(childId);
  const { progress } = recordHubDailyAdventureEvent(current, worldId, kind, amount);
  writeHubDaily(childId, progress);
  return progress;
}

export type HubDailyAdventureView = {
  progress: HubDailyAdventureProgress;
  pct: number;
  done: number;
  total: number;
};

export function getHubDailyAdventureView(childId: number): HubDailyAdventureView {
  const progress = loadHubDailyAdventure(childId);
  const { done, total } = hubDailyAdventureCompletedCount(progress);
  return {
    progress,
    pct: dailyAdventureCompletionPct(progress),
    done,
    total,
  };
}

/** Test helper: force a known progress payload into storage. */
export function __setHubDailyAdventureForTests(
  childId: number,
  progress: HubDailyAdventureProgress,
): void {
  writeHubDaily(childId, progress);
}

/** Test helper: rebuild without reading stale storage. */
export function __buildFreshHubDailyForTests(childId: number): HubDailyAdventureProgress {
  return buildHubDailyAdventure(childId, getHubWorldCatalogs());
}
