import type { WorldId } from "./types.js";
import { modesForWorld } from "./standard-modes.js";
import { WORLD_GCS_FOLDER } from "./gcs-layout.js";

export type DiscoveryWorldDefinition = {
  worldId: WorldId;
  title: string;
  subtitle: string;
  emoji: string;
  /** Kidschedule route — Animal World keeps /animal-world */
  routePath: string;
  hubModuleGate: string;
  gcsFolder: string;
  status: "live" | "preview" | "planned";
  referenceImplementation?: boolean;
};

export const DISCOVERY_WORLDS_REGISTRY: DiscoveryWorldDefinition[] = [
  {
    worldId: "animal_world",
    title: "Animal World",
    subtitle: "Farm, wild, sea & more",
    emoji: "🐾",
    routePath: "/animal-world",
    hubModuleGate: "hub_animal_world",
    gcsFolder: WORLD_GCS_FOLDER.animal_world,
    status: "live",
    referenceImplementation: true,
  },
  {
    worldId: "vehicle_world",
    title: "Vehicle World",
    subtitle: "Cars, trains, rockets",
    emoji: "🚗",
    routePath: "/worlds/vehicles",
    hubModuleGate: "hub_vehicle_world",
    gcsFolder: WORLD_GCS_FOLDER.vehicle_world,
    status: "live",
  },
  {
    worldId: "nature_world",
    title: "Nature Sounds",
    subtitle: "Rain, ocean, forest",
    emoji: "🌧️",
    routePath: "/worlds/nature",
    hubModuleGate: "hub_nature_world",
    gcsFolder: WORLD_GCS_FOLDER.nature_world,
    status: "live",
  },
  {
    worldId: "home_sounds_world",
    title: "Home Sounds",
    subtitle: "Everyday home noises",
    emoji: "🏠",
    routePath: "/worlds/home",
    hubModuleGate: "hub_home_sounds_world",
    gcsFolder: WORLD_GCS_FOLDER.home_sounds_world,
    status: "live",
  },
  {
    worldId: "instrument_world",
    title: "Instrument World",
    subtitle: "Piano, drums & more",
    emoji: "🎵",
    routePath: "/worlds/instruments",
    hubModuleGate: "hub_instrument_world",
    gcsFolder: WORLD_GCS_FOLDER.instrument_world,
    status: "live",
  },
];

export function getDiscoveryWorldDefinition(worldId: WorldId): DiscoveryWorldDefinition | undefined {
  return DISCOVERY_WORLDS_REGISTRY.find((w) => w.worldId === worldId);
}

export function getLiveDiscoveryWorlds(): DiscoveryWorldDefinition[] {
  return DISCOVERY_WORLDS_REGISTRY.filter((w) => w.status === "live");
}

export function getPreviewDiscoveryWorlds(): DiscoveryWorldDefinition[] {
  return DISCOVERY_WORLDS_REGISTRY.filter((w) => w.status === "preview");
}

export function modeIdsForWorld(worldId: WorldId): string[] {
  return modesForWorld(worldId).map((m) => m.id);
}
