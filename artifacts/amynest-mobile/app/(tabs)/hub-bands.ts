// 2-section Parent Hub age band metadata. Lives in its own module so that the
// constants/helpers can be unit-tested without pulling in the heavy hub.tsx
// component graph (firebase, expo-router, etc.). Re-exported from hub.tsx for
// callers that already import from there.

export const HUB_AGE_BANDS = [
  { idx: 0, label: "0–2", minMonths: 0,   maxMonths: 24  },
  { idx: 1, label: "2–4", minMonths: 24,  maxMonths: 48  },
  { idx: 2, label: "4–6", minMonths: 48,  maxMonths: 72  },
  { idx: 3, label: "6–8", minMonths: 72,  maxMonths: 96  },
  { idx: 4, label: "8–10", minMonths: 96, maxMonths: 120 },
  { idx: 5, label: "10–12", minMonths: 120, maxMonths: 144 },
  { idx: 6, label: "12–15", minMonths: 144, maxMonths: 180 },
] as const;

export function getAgeBand(ageYears: number, ageMonths = 0): number {
  const total = ageYears * 12 + ageMonths;
  if (total < 0) return 0;
  for (let i = 0; i < HUB_AGE_BANDS.length; i++) {
    const b = HUB_AGE_BANDS[i];
    if (total >= b.minMonths && total < b.maxMonths) return i;
  }
  return HUB_AGE_BANDS.length - 1;
}

// Standalone metadata: which bands each tile is intended for. Lives outside
// the JSX so it's easy to tweak/scale without touching the render code.
//
// Source of truth: artifacts/kidschedule/src/pages/parenting-hub.tsx
// `sections` array. Mobile mirrors web for shared tiles; entries flagged
// with "mobile-only" below have no web counterpart and are intentional
// mobile additions documented in lib/hubWebReference.ts (MOBILE_ONLY_EXTRAS).
export const HUB_CONTENT_AGE_BANDS: Record<string, readonly number[]> = {
  // Always-current (web `alwaysCurrent: true`).
  amy:                   [0, 1, 2, 3, 4, 5, 6],
  articles:              [0, 1, 2, 3, 4, 5, 6],
  tips:                  [0, 1, 2, 3, 4, 5, 6],
  emotional:             [0, 1, 2, 3, 4, 5, 6],
  activities:            [0, 1, 2, 3, 4, 5, 6],
  "art-craft":           [0, 1, 2, 3, 4, 5, 6],
  nutrition:             [0, 1, 2, 3, 4, 5, 6], // mobile-only
  "meal-suggestions":    [0, 1, 2, 3, 4, 5, 6], // mobile-only

  // Band-restricted (web tiles with explicit `bands: [...]`).
  "story-hub":           [0, 1, 2, 3],          // web: 0-2, 2-4, 4-6, 6-8
  phonics:               [1, 2],                // web: 2-4, 4-6 + 12-72m
  "smart-math-tricks":   [2, 3],                // web: 4-6, 6-8
  "ptm-prep":            [2, 3, 4, 5, 6],       // web: 4-6..12-15 + 36-216m
  "smart-study":         [2, 3, 4, 5, 6],       // web: 4-6..12-15 + 36-204m
  "event-prep":          [2, 3, 4, 5, 6],       // web: 4-6..12-15 + 36-180m
  olympiad:              [2, 3, 4, 5, 6],       // web: 4-6..12-15 + 36-192m
  "life-skills":         [1, 2, 3, 4, 5, 6],    // web: 2-4..12-15 + 24-192m
  "coloring-books":      [1, 2, 3, 4, 5, 6],    // web: 2-4..12-15 + ≥24m
  "fun-sheets":          [1, 2, 3, 4, 5, 6],    // web: 2-4..12-15 + ≥24m

  // Mobile-only extras (no web counterpart). Documented in
  // lib/hubWebReference.ts so the dev overlay doesn't flag them.
  "morning-flow":        [2, 3, 4, 5, 6],
  "kids-control-center": [3, 4, 5, 6],
  meals:                 [1, 2, 3, 4, 5, 6],
  worksheets:            [1, 2, 3, 4, 5],
  facts:                 [2, 3, 4, 5, 6],
};

// Per-tile age-month bounds, mirroring the totalAgeMonths gates in the web
// `sections` array (e.g. `totalAgeMonths >= 36 && totalAgeMonths < 216`).
// Tiles absent from this map have no month-level gating beyond their bands.
// Bounds are *inclusive min, exclusive max* (i.e. `[min, max)`).
export const HUB_TILE_AGE_MONTHS: Record<string, { min?: number; max?: number }> = {
  phonics:          { min: 12, max: 72 },
  "ptm-prep":       { min: 36, max: 216 },
  "smart-study":    { min: 36, max: 204 },
  "event-prep":     { min: 36, max: 180 },
  olympiad:         { min: 36, max: 192 },
  "life-skills":    { min: 24, max: 192 },
  "coloring-books": { min: 24 },
  "fun-sheets":     { min: 24 },
};

// Minimal shape required by `partitionTilesByBand`. The function is generic
// over the rest of the tile so callers (e.g. hub.tsx) can keep their own
// extra fields like the rendered React node attached.
export type HubBandTile = {
  id: string;
  ageBands: readonly number[];
  /** Optional inclusive minimum totalAgeMonths gate. */
  ageMonthsMin?: number;
  /** Optional exclusive maximum totalAgeMonths gate. */
  ageMonthsMax?: number;
};

export interface HubBandPartition<T extends HubBandTile> {
  /** Tiles whose ageBands include the child's current band. */
  section1: T[];
  /** Tiles that don't cover the current band but have at least one strictly
   * future band. These power the "Explore Next Stage" section. */
  section2: T[];
  /** Tiles that have no current and no future band — past-only content that
   * is intentionally not surfaced anywhere on the hub. */
  hidden: T[];
  /** Section 2 tiles grouped by their *nearest* future band only, so a tile
   * never appears in more than one Explore group. */
  groupsByFutureBand: Map<number, T[]>;
  /** Future band indices that have at least one tile, sorted ascending. */
  orderedFutureBands: number[];
  /** Smallest future band index with tiles, or null if there are none. Used
   * to pin the "Coming Up Next" pill on the closest upcoming group. */
  nearestFutureBand: number | null;
  /** True when the child has no future bands left with content — used to
   * hide the entire Explore section on the last stage. */
  isLatestStage: boolean;
}

/**
 * Partition hub tiles into the Section 1 / Section 2 / hidden buckets used
 * by the Parent Hub. Pure and side-effect free so it can be unit-tested
 * independently of the React tree.
 *
 * Rules:
 *  - A tile is *eligible* when its optional ageMonths bounds (if any) are
 *    satisfied by `ageMonths`. Ineligible tiles are dropped to `hidden`
 *    even if their bands cover the current band — this matches web's
 *    behaviour where a tile with `totalAgeMonths < 36` doesn't render even
 *    if its band is current.
 *  - Section 1 = eligible tiles whose `ageBands` include `currentBand`.
 *  - Section 2 = eligible tiles that do NOT include `currentBand` but
 *    include at least one band strictly greater than `currentBand`.
 *  - Section 2 tiles are grouped by their *nearest* future band so each
 *    tile renders in exactly one Explore group.
 */
export function partitionTilesByBand<T extends HubBandTile>(
  tiles: readonly T[],
  currentBand: number,
  ageMonths?: number,
): HubBandPartition<T> {
  const section1: T[] = [];
  const section2: T[] = [];
  const hidden: T[] = [];
  const groupsByFutureBand = new Map<number, T[]>();

  for (const tile of tiles) {
    // Apply age-month gating first. A tile that fails its bounds is hidden
    // regardless of band membership (matches web's per-section guards like
    // `totalAgeMonths >= 36 && totalAgeMonths < 216`).
    const monthsOk =
      ageMonths == null ||
      ((tile.ageMonthsMin == null || ageMonths >= tile.ageMonthsMin) &&
       (tile.ageMonthsMax == null || ageMonths < tile.ageMonthsMax));

    if (!monthsOk) {
      hidden.push(tile);
      continue;
    }

    if (tile.ageBands.includes(currentBand)) {
      section1.push(tile);
      continue;
    }
    // Find the nearest future band (smallest band > currentBand) without
    // mutating or re-sorting the source array per tile.
    let nearestFuture: number | null = null;
    for (const b of tile.ageBands) {
      if (b > currentBand && (nearestFuture === null || b < nearestFuture)) {
        nearestFuture = b;
      }
    }
    if (nearestFuture === null) {
      hidden.push(tile);
      continue;
    }
    section2.push(tile);
    const arr = groupsByFutureBand.get(nearestFuture) ?? [];
    arr.push(tile);
    groupsByFutureBand.set(nearestFuture, arr);
  }

  const orderedFutureBands = [...groupsByFutureBand.keys()].sort((a, b) => a - b);
  const nearestFutureBand = orderedFutureBands[0] ?? null;
  const isLatestStage = orderedFutureBands.length === 0;

  return {
    section1,
    section2,
    hidden,
    groupsByFutureBand,
    orderedFutureBands,
    nearestFutureBand,
    isLatestStage,
  };
}
