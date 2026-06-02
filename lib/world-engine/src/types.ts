/** Multi-world learning platform — shared types for Animal, Vehicle, Nature, etc. */

export const WORLD_IDS = [
  "animal_world",
  "vehicle_world",
  "nature_world",
  "instrument_world",
  "home_sounds_world",
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

export type WorldItemBase = {
  id: string;
  name: string;
  emoji: string;
  category: string;
};

export type WorldCatalogBase<T extends WorldItemBase = WorldItemBase> = {
  version: number;
  worldId: WorldId;
  items: T[];
};

export type WorldModeDefinition = {
  id: string;
  label: string;
};

export type WorldProgressSnapshot = {
  childId: number;
  worldId: WorldId;
  xp: number;
  itemsDiscovered: string[];
  itemsMastered: string[];
};

export type WorldAnalyticsEvent =
  | "world_opened"
  | "item_opened"
  | "sound_played"
  | "mode_changed"
  | "game_started"
  | "game_completed";
