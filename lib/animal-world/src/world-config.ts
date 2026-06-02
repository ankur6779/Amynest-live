import type { WorldCatalogBase, WorldModeDefinition } from "@workspace/world-engine";
import { WorldEngine } from "@workspace/world-engine";
import type { Animal, AnimalWorldCatalog } from "./types.js";
import { getAnimalWorldCatalog } from "./catalog.js";

export const ANIMAL_WORLD_MODES: WorldModeDefinition[] = [
  { id: "explore", label: "Explore" },
  { id: "toddler", label: "Toddler" },
  { id: "quiz", label: "Quiz" },
  { id: "hear_find", label: "Hear & Find" },
  { id: "discovery", label: "Discovery" },
  { id: "achievements", label: "Stars" },
  { id: "stickers", label: "Stickers" },
  { id: "parent", label: "Parent" },
];

function toWorldCatalog(catalog: AnimalWorldCatalog): WorldCatalogBase<Animal> {
  return {
    version: catalog.version,
    worldId: "animal_world",
    items: catalog.animals,
  };
}

let engineSingleton: WorldEngine<Animal> | null = null;

export function getAnimalWorldEngine(): WorldEngine<Animal> {
  if (!engineSingleton) {
    const catalog = getAnimalWorldCatalog();
    engineSingleton = new WorldEngine({
      worldId: "animal_world",
      catalog: toWorldCatalog(catalog),
      modes: ANIMAL_WORLD_MODES,
    });
  }
  return engineSingleton;
}

/** Placeholder configs for future worlds — same engine, different catalogs. */
export const FUTURE_WORLD_IDS = [
  "vehicle_world",
  "nature_world",
  "instrument_world",
  "home_sounds_world",
] as const;
