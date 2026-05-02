// ─── Shared activity-category → icon map ────────────────────────────────────
// Single source of truth for the Ionicons name shown for each routine
// category. Both the dashboard ("Today's activities" carousel) and the
// routine detail screen import from here so they can never silently drift
// when a new category (e.g. `screen_time`) is added on the server.
//
// The categories listed below MUST cover every category emitted by
// `generateRuleBasedRoutine` in `artifacts/api-server/src/lib/routine-templates.ts`.
// A unit test asserts this contract — see
// `artifacts/amynest-mobile/__tests__/categoryIcons.test.ts`.

import type { Ionicons } from "@expo/vector-icons";

export type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export type CategoryIconPair = {
  /** Filled / solid Ionicons glyph (used by the dashboard carousel). */
  solid: IoniconName;
  /** Outline Ionicons glyph (used by the routine detail timeline). */
  outline: IoniconName;
};

const DEFAULT_PAIR: CategoryIconPair = {
  solid: "ellipse-outline",
  outline: "ellipse-outline",
};

export const CATEGORY_ICON_PAIRS: Record<string, CategoryIconPair> = {
  morning:         { solid: "sunny",          outline: "sunny-outline" },
  morning_routine: { solid: "sunny",          outline: "sunny-outline" },
  meal:            { solid: "restaurant",     outline: "restaurant-outline" },
  tiffin:          { solid: "fast-food",      outline: "fast-food-outline" },
  school:          { solid: "school",         outline: "school-outline" },
  travel:          { solid: "car",            outline: "car-outline" },
  homework:        { solid: "book",           outline: "book-outline" },
  study:           { solid: "book",           outline: "book-outline" },
  play:            { solid: "football",       outline: "football-outline" },
  exercise:        { solid: "fitness",        outline: "fitness-outline" },
  family:          { solid: "heart",          outline: "heart-outline" },
  bonding:         { solid: "people",         outline: "people-outline" },
  creative:        { solid: "color-palette",  outline: "color-palette-outline" },
  outdoor:         { solid: "leaf",           outline: "leaf-outline" },
  self_care:       { solid: "sparkles",       outline: "sparkles-outline" },
  hygiene:         { solid: "water",          outline: "water-outline" },
  rest:            { solid: "pause-circle",   outline: "pause-circle-outline" },
  "wind-down":     { solid: "moon",           outline: "moon-outline" },
  sleep:           { solid: "moon",           outline: "moon-outline" },
  screen:          { solid: "tv",             outline: "tv-outline" },
  default:         DEFAULT_PAIR,
};

/** Resolve the filled icon for a category (case-insensitive). */
export function categoryIcon(category: string | null | undefined): IoniconName {
  const key = (category ?? "").toLowerCase();
  return (CATEGORY_ICON_PAIRS[key] ?? DEFAULT_PAIR).solid;
}

/** Resolve the outline icon for a category (case-insensitive). */
export function categoryOutlineIcon(category: string | null | undefined): IoniconName {
  const key = (category ?? "").toLowerCase();
  return (CATEGORY_ICON_PAIRS[key] ?? DEFAULT_PAIR).outline;
}

/** Categories explicitly mapped (excludes the `default` fallback entry). */
export const KNOWN_CATEGORIES: string[] = Object.keys(CATEGORY_ICON_PAIRS).filter(
  (k) => k !== "default",
);
