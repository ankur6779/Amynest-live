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
import { useTranslation } from "react-i18next";
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
  abacus: "modules",
  "story-hub": "modules",
  "ptm-prep": "modules",
  "smart-study": "modules",
  "event-prep": "modules",
  olympiad: "modules",
  "coloring-books": "modules",
  "fun-sheets": "modules",
  worksheets: "modules",
  facts: "modules",
  "skills-focus": "modules",

  // Activities — hands-on play, life skills, food.
  activities: "activities",
  "art-craft": "activities",
  "life-skills": "activities",
  "morning-flow": "activities",
  meals: "activities",
  "daily-story": "activities",
  "daily-puzzle": "activities",
  "infant-parenting": "activities",
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
 * Map a routine item's `category` to the hub tile that best continues the
 * activity (Task #191). Used by Today's Plan to render an "Open in // audit-ok: task ref not hex
 * Modules / Activities / Zones" quick-jump on completed routine items so
 * a parent who just finished e.g. "20 min phonics practice" can step
 * straight into the matching tile without swiping back through pages.
 *
 * Categories with no sensible target intentionally omit an entry — the
 * link simply doesn't render for those items (school / sleep / hygiene
 * etc.).
 */
export const ROUTINE_CATEGORY_TO_TILE_ID: Readonly<Record<string, string>> = {
  homework: "smart-study",
  study: "smart-study",
  reading: "story-hub",
  creative: "art-craft",
  play: "activities",
  outdoor: "activities",
  meal: "meals",
  tiffin: "meals",
  snack: "meals",
  exercise: "life-skills",
  morning: "morning-flow",
  morning_routine: "morning-flow",
  bonding: "tips",
  family: "tips",
};

/**
 * Resolve a routine category string to a tile id, or `null` if no
 * mapping exists. Case-insensitive.
 */
export function routineCategoryToTileId(
  category: string | null | undefined,
): string | null {
  if (!category) return null;
  return ROUTINE_CATEGORY_TO_TILE_ID[category.toLowerCase()] ?? null;
}

/**
 * Resolve a tile id to its hub section, or `null` if the id isn't part
 * of the partitioned grid (e.g. featured tiles). Used by Today's Plan
 * to know which pager page to jump to for a given quick-jump target.
 */
export function tileIdToSection(
  tileId: string | null | undefined,
): Exclude<SectionKey, "today"> | null {
  if (!tileId) return null;
  return TILE_SECTION_MAP[tileId] ?? null;
}

/** Friendly label for a section's quick-jump CTA ("Go to Learn" etc.).
 *  Wording is intentionally short and scroll-friendly — the single-scroll hub
 *  keeps all tiles visible so "Open in …" (which implied a tab-jump) no longer
 *  makes sense. "Go to …" tells parents they will scroll to the tile.
 *  ⚠ English-only fallback — prefer `useSectionCtaLabel` inside React.
 *  Kept as a pure function so non-React callers (tests, helpers) still work. */
export function sectionCtaLabel(
  section: Exclude<SectionKey, "today">,
): string {
  if (section === "modules") return "Go to Learn";
  if (section === "activities") return "Go to Activities";
  return "Go to Zones";
}

/**
 * React hook returning a localised section CTA label resolver. The returned
 * function reads from the `parent_hub.sections_meta.cta_*` keys so the label
 * follows the active language without requiring callers to thread `t()`
 * around. Use inside any component rendering quick-jump buttons.
 */
export function useSectionCtaLabel(): (
  section: Exclude<SectionKey, "today">,
) => string {
  const { t } = useTranslation();
  return (section) => {
    if (section === "modules") return t("parent_hub.sections_meta.cta_modules");
    if (section === "activities") return t("parent_hub.sections_meta.cta_activities");
    return t("parent_hub.sections_meta.cta_zones");
  };
}

/**
 * React hook returning a fully localised SECTION_META map. The structure
 * matches the static `SECTION_META` (same keys, same icon glyphs) but the
 * `label`, `heading`, and `description` strings are pulled from the active
 * i18n bundle. Use inside the Parent Hub shell so the tab bar, page
 * headings, and aria labels follow the chosen language.
 */
export function useSectionMeta(): Readonly<Record<SectionKey, SectionMeta>> {
  const { t } = useTranslation();
  return {
    today: {
      key: "today",
      label: t("parent_hub.sections_meta.today.label"),
      heading: t("parent_hub.sections_meta.today.heading"),
      description: t("parent_hub.sections_meta.today.description"),
      icon: "today",
    },
    zones: {
      key: "zones",
      label: t("parent_hub.sections_meta.zones.label"),
      heading: t("parent_hub.sections_meta.zones.heading"),
      description: t("parent_hub.sections_meta.zones.description"),
      icon: "compass",
    },
    modules: {
      key: "modules",
      label: t("parent_hub.sections_meta.modules.label"),
      heading: t("parent_hub.sections_meta.modules.heading"),
      description: t("parent_hub.sections_meta.modules.description"),
      icon: "school",
    },
    activities: {
      key: "activities",
      label: t("parent_hub.sections_meta.activities.label"),
      heading: t("parent_hub.sections_meta.activities.heading"),
      description: t("parent_hub.sections_meta.activities.description"),
      icon: "color-palette",
    },
  };
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
