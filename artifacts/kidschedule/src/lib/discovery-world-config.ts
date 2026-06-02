import type { WorldId, WorldManifest, WorldManifestItem } from "@workspace/world-engine";
import { getDiscoveryWorldDefinition } from "@workspace/world-engine";
import { getVehicleWorldManifest, resolveVehicleAssetUrl } from "@workspace/vehicle-world";
import { getNatureWorldManifest, resolveNatureAssetUrl } from "@workspace/nature-sounds-world";
import { getHomeSoundsManifest, resolveHomeSoundAssetUrl } from "@workspace/home-sounds-world";
import { getInstrumentWorldManifest, resolveInstrumentAssetUrl } from "@workspace/instrument-world";

export type DiscoveryWorldRuntimeConfig = {
  worldId: WorldId;
  title: string;
  subtitle: string;
  emoji: string;
  hubModuleGate: string;
  manifest: WorldManifest;
  resolveAssetUrl: (gcsPath: string) => string;
  resolveSoundUrl: (item: WorldManifestItem, soundId: string) => string | null;
  getPrimarySound: (item: WorldManifestItem) => WorldManifestItem["sounds"][0] | undefined;
};

function primarySound(item: WorldManifestItem) {
  return item.sounds.find((s) => s.id === item.quizSoundId) ?? item.sounds[0];
}

const CONFIGS: Partial<Record<WorldId, DiscoveryWorldRuntimeConfig>> = {
  vehicle_world: {
    worldId: "vehicle_world",
    title: "Vehicle World",
    subtitle: "Meet the vehicles",
    emoji: "🚗",
    hubModuleGate: "hub_vehicle_world",
    manifest: getVehicleWorldManifest(),
    resolveAssetUrl: resolveVehicleAssetUrl,
    resolveSoundUrl: (item, soundId) => {
      const s = item.sounds.find((x) => x.id === soundId);
      return s ? resolveVehicleAssetUrl(s.gcsPath) : null;
    },
    getPrimarySound: primarySound,
  },
  nature_world: {
    worldId: "nature_world",
    title: "Nature Sounds",
    subtitle: "Listen to nature",
    emoji: "🌧️",
    hubModuleGate: "hub_nature_world",
    manifest: getNatureWorldManifest(),
    resolveAssetUrl: resolveNatureAssetUrl,
    resolveSoundUrl: (item, soundId) => {
      const s = item.sounds.find((x) => x.id === soundId);
      return s ? resolveNatureAssetUrl(s.gcsPath) : null;
    },
    getPrimarySound: primarySound,
  },
  home_sounds_world: {
    worldId: "home_sounds_world",
    title: "Home Sounds",
    subtitle: "Sounds around the house",
    emoji: "🏠",
    hubModuleGate: "hub_home_sounds_world",
    manifest: getHomeSoundsManifest(),
    resolveAssetUrl: resolveHomeSoundAssetUrl,
    resolveSoundUrl: (item, soundId) => {
      const s = item.sounds.find((x) => x.id === soundId);
      return s ? resolveHomeSoundAssetUrl(s.gcsPath) : null;
    },
    getPrimarySound: primarySound,
  },
  instrument_world: {
    worldId: "instrument_world",
    title: "Instrument World",
    subtitle: "Hear the instruments",
    emoji: "🎵",
    hubModuleGate: "hub_instrument_world",
    manifest: getInstrumentWorldManifest(),
    resolveAssetUrl: resolveInstrumentAssetUrl,
    resolveSoundUrl: (item, soundId) => {
      const s = item.sounds.find((x) => x.id === soundId);
      return s ? resolveInstrumentAssetUrl(s.gcsPath) : null;
    },
    getPrimarySound: primarySound,
  },
};

export function getDiscoveryWorldConfig(worldId: WorldId): DiscoveryWorldRuntimeConfig | undefined {
  return CONFIGS[worldId];
}

export function getDiscoveryWorldConfigBySlug(slug: string): DiscoveryWorldRuntimeConfig | undefined {
  const map: Record<string, WorldId> = {
    vehicles: "vehicle_world",
    nature: "nature_world",
    home: "home_sounds_world",
    instruments: "instrument_world",
  };
  const worldId = map[slug];
  if (!worldId) return undefined;
  const def = getDiscoveryWorldDefinition(worldId);
  if (!def || def.status !== "live") return undefined;
  return CONFIGS[worldId];
}
