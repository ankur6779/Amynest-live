import type { WorldId } from "./types.js";
import type { WorldModeDefinition } from "./types.js";

/** Core modes shared by every discovery world (Animal World reference set). */
export const STANDARD_WORLD_MODES: WorldModeDefinition[] = [
  { id: "explore", label: "Explore" },
  { id: "toddler", label: "Toddler" },
  { id: "quiz", label: "Quiz" },
  { id: "hear_find", label: "Hear & Find" },
  { id: "discovery", label: "Discovery" },
  { id: "achievements", label: "Stars" },
  { id: "stickers", label: "Stickers" },
  { id: "parent", label: "Parent" },
];

/** Nature Sounds World — additive modes (does not remove standard set). */
export const NATURE_EXTRA_MODES: WorldModeDefinition[] = [
  { id: "relax", label: "Relax" },
  { id: "sleep", label: "Sleep" },
];

/** Instrument World — additive modes. */
export const INSTRUMENT_EXTRA_MODES: WorldModeDefinition[] = [
  { id: "orchestra", label: "Orchestra" },
];

export function modesForWorld(worldId: WorldId): WorldModeDefinition[] {
  switch (worldId) {
    case "nature_world":
      return [...STANDARD_WORLD_MODES, ...NATURE_EXTRA_MODES];
    case "instrument_world":
      return [...STANDARD_WORLD_MODES, ...INSTRUMENT_EXTRA_MODES];
    default:
      return [...STANDARD_WORLD_MODES];
  }
}

export type StandardWorldModeId =
  | "explore"
  | "toddler"
  | "quiz"
  | "hear_find"
  | "discovery"
  | "achievements"
  | "stickers"
  | "parent";
