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
export const HUB_CONTENT_AGE_BANDS: Record<string, readonly number[]> = {
  amy:                   [0, 1, 2, 3, 4, 5, 6],
  articles:              [0, 1, 2, 3, 4, 5, 6],
  tips:                  [0, 1, 2, 3, 4, 5, 6],
  emotional:             [0, 1, 2, 3, 4, 5, 6],
  "ptm-prep":            [2, 3, 4, 5, 6],
  "smart-study":         [1, 2, 3, 4, 5, 6],
  "morning-flow":        [2, 3, 4, 5, 6],
  olympiad:              [3, 4, 5, 6],
  "kids-control-center": [3, 4, 5, 6],
  meals:                 [1, 2, 3, 4, 5, 6],
  nutrition:             [0, 1, 2, 3, 4, 5, 6],
  "event-prep":          [1, 2, 3, 4, 5],
  activities:            [0, 1, 2, 3, 4, 5],
  "story-hub":           [1, 2, 3, 4, 5],
  "art-craft":           [1, 2, 3, 4],
  worksheets:            [1, 2, 3, 4, 5],
  facts:                 [2, 3, 4, 5, 6],
  "life-skills":         [1, 2, 3, 4, 5, 6],
  "meal-suggestions":    [0, 1, 2, 3, 4, 5, 6],
};

// Minimal shape required by `partitionTilesByBand`. The function is generic
// over the rest of the tile so callers (e.g. hub.tsx) can keep their own
// extra fields like the rendered React node attached.
export type HubBandTile = { id: string; ageBands: readonly number[] };

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
 *  - Section 1 = tiles whose `ageBands` include `currentBand`.
 *  - Section 2 = tiles that do NOT include `currentBand` but include at
 *    least one band strictly greater than `currentBand` (forward-looking
 *    only — past-only tiles are hidden, not surfaced as "catch-up").
 *  - Section 2 tiles are grouped by their *nearest* future band so each
 *    tile renders in exactly one Explore group.
 */
export function partitionTilesByBand<T extends HubBandTile>(
  tiles: readonly T[],
  currentBand: number,
): HubBandPartition<T> {
  const section1: T[] = [];
  const section2: T[] = [];
  const hidden: T[] = [];
  const groupsByFutureBand = new Map<number, T[]>();

  for (const tile of tiles) {
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
