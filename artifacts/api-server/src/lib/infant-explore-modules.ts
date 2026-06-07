/**
 * Parent Hub tiles surfaced in "Explore the next stage" for infants (0–23 mo).
 * Mirrors kidschedule `SECTION_2_EARLY_ACCESS_TILE_IDS`.
 */
export const EXPLORE_NEXT_STAGE_TILE_IDS = [
  "life-skills",
  "olympiad",
  "event-prep",
  "smart-math-tricks",
  "abacus",
  "smart-study",
  "ptm-prep",
  "phonics",
  "coloring-books",
  "fun-sheets",
] as const;

export type ExploreNextStageTileId = (typeof EXPLORE_NEXT_STAGE_TILE_IDS)[number];

/** Hub feature IDs used for quota / tile-open tracking on explore modules. */
export const EXPLORE_NEXT_STAGE_HUB_FEATURES = [
  "hub_life_skills",
  "hub_olympiad",
  "hub_event_prep",
  "hub_smart_math_tricks",
  "hub_abacus",
  "hub_smart_study",
  "hub_ptm_prep",
  "hub_phonics",
  "hub_coloring_books",
  "hub_fun_sheets",
] as const;

export type ExploreNextStageHubFeatureId = (typeof EXPLORE_NEXT_STAGE_HUB_FEATURES)[number];

const exploreHubFeatureSet = new Set<string>(EXPLORE_NEXT_STAGE_HUB_FEATURES);

export function isExploreNextStageHubFeature(
  featureId: string,
): featureId is ExploreNextStageHubFeatureId {
  return exploreHubFeatureSet.has(featureId);
}

/** `learning/load-more` sections that map to explore-next-stage tiles. */
export const EXPLORE_LOAD_MORE_SECTIONS = [
  "smart_study",
  "smart_math_tricks",
  "olympiad",
  "phonics",
  "life_skills",
] as const;

export type ExploreLoadMoreSection = (typeof EXPLORE_LOAD_MORE_SECTIONS)[number];

const exploreLoadMoreSet = new Set<string>(EXPLORE_LOAD_MORE_SECTIONS);

export function isExploreLoadMoreSection(section: string): section is ExploreLoadMoreSection {
  return exploreLoadMoreSet.has(section);
}
