// 4-section taxonomy for the redesigned mobile Parent Hub.
//
// Lives in its own pure module so the section partition can be unit-tested
// without mounting the full Hub screen. The `hub.tsx` component imports
// `SECTION_KEYS` + `bucketTilesBySection` to render its horizontal pager
// and the test in `__tests__/hub-bands.test.ts` uses the same map to lock
// in the invariant that every tile in `HUB_CONTENT_AGE_BANDS` belongs to
// exactly one of the 4 sections.

import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";
import { HUB_CONTENT_AGE_BANDS } from "./hub-bands";

export const SECTION_KEYS = ["today", "zones", "modules", "activities"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

/** The exhaustive Ionicons glyph-name union, narrowed to a single type alias. */
export type IoniconName = ComponentProps<typeof Ionicons>["name"];

export interface SectionMeta {
  key: SectionKey;
  /** Short tab label shown in the top tab bar. */
  label: string;
  /** Long-form heading rendered above the section's content. */
  heading: string;
  /** Sub-heading shown beneath the heading on the active page. */
  description: string;
  /** Ionicons glyph name for the tab bar — typed against the icon set. */
  icon: IoniconName;
}

export const SECTION_META: Readonly<Record<SectionKey, SectionMeta>> = {
  today: {
    key: "today",
    label: "Today",
    heading: "Today's Plan",
    description: "Tap Done as you finish each step",
    icon: "today",
  },
  zones: {
    key: "zones",
    label: "Zones",
    heading: "Recommended Zones",
    description: "Curated parent surfaces & quick actions",
    icon: "compass",
  },
  modules: {
    key: "modules",
    label: "Learn",
    heading: "Learning Modules",
    description: "Practice + content matched to your child's age",
    icon: "school",
  },
  activities: {
    key: "activities",
    label: "Do",
    heading: "Activities",
    description: "Hands-on play, life skills & food",
    icon: "color-palette",
  },
};

/**
 * Map every grid-tile id to the section it lives under in the new layout.
 *
 * Featured tiles (`command-center`, `infant-hub`, `tomorrow-forecast`) are
 * NOT in this map because they are not part of the partitioned grid — they
 * render directly inside the Recommended Zones section as featured cards.
 *
 * The unit test in hub-bands.test.ts asserts that every tile id in
 * HUB_CONTENT_AGE_BANDS is covered by this map, so adding a new tile to
 * the band map without updating this file fails CI.
 */
export const TILE_SECTION_MAP: Readonly<Record<string, Exclude<SectionKey, "today">>> = {
  // Recommended Zones — parent-facing surfaces and quick actions.
  amy: "zones",
  articles: "zones",
  tips: "zones",
  emotional: "zones",
  "kids-control-center": "zones",

  // Learning Modules — academic + practice content.
  phonics: "modules",
  "smart-math-tricks": "modules",
  "story-hub": "modules",
  "ptm-prep": "modules",
  "smart-study": "modules",
  "event-prep": "modules",
  olympiad: "modules",
  "coloring-books": "modules",
  "fun-sheets": "modules",
  worksheets: "modules",
  facts: "modules",

  // Activities — hands-on play, life skills, food.
  activities: "activities",
  "art-craft": "activities",
  "life-skills": "activities",
  "morning-flow": "activities",
  meals: "activities",
  "meal-suggestions": "activities",
  nutrition: "activities",
};

/**
 * Featured tile ids rendered above the partitioned grid. Always live in the
 * Recommended Zones section.
 */
export const FEATURED_TILE_IDS = [
  "command-center",
  "infant-hub",
  "tomorrow-forecast",
] as const;
export type FeaturedTileId = (typeof FEATURED_TILE_IDS)[number];

/**
 * Bucket a list of tile ids into the 3 grid sections (zones / modules /
 * activities). Order is preserved within each bucket. Tiles with no map
 * entry are returned in `unmapped` so callers can surface a warning in dev.
 */
export function bucketTilesBySection<T extends { id: string }>(
  tiles: readonly T[],
): { zones: T[]; modules: T[]; activities: T[]; unmapped: T[] } {
  const zones: T[] = [];
  const modules: T[] = [];
  const activities: T[] = [];
  const unmapped: T[] = [];
  for (const tile of tiles) {
    const target = TILE_SECTION_MAP[tile.id];
    if (target === "zones") zones.push(tile);
    else if (target === "modules") modules.push(tile);
    else if (target === "activities") activities.push(tile);
    else unmapped.push(tile);
  }
  return { zones, modules, activities, unmapped };
}

/** True when a tile id is one of the featured (Section-1 above-grid) cards. */
export function isFeaturedTile(id: string): id is FeaturedTileId {
  return (FEATURED_TILE_IDS as readonly string[]).includes(id);
}

/**
 * Internal sanity check: throws (in dev) when HUB_CONTENT_AGE_BANDS contains
 * a tile id that has no entry in TILE_SECTION_MAP. Called from the unit
 * test so the partition stays exhaustive.
 */
export function assertTileSectionMapCoversAllBandTiles(): void {
  const bandIds = Object.keys(HUB_CONTENT_AGE_BANDS);
  const missing = bandIds.filter((id) => !(id in TILE_SECTION_MAP));
  if (missing.length > 0) {
    throw new Error(
      `TILE_SECTION_MAP missing entries for: ${missing.join(", ")}`,
    );
  }
}
