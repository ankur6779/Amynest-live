/**
 * Hub age-band metadata tests
 *
 * Locks in the contract behind the Parent Hub's 2-section, 7-band layout
 * (introduced in task #107). These tests catch regressions in the band
 * configuration without needing to mount the full Hub screen — for example,
 * if someone edits a tile's `ageBands` array and accidentally drops the
 * child's current band, or if a tile ends up assigned to both Section 1 and
 * Section 2 for some band.
 *
 * Task #176 brought the inventory to full parity with web — see
 * artifacts/kidschedule/src/pages/parenting-hub.tsx for the source of truth.
 */
import { describe, it, expect } from "vitest";
import {
  HUB_AGE_BANDS,
  getAgeBand,
  HUB_CONTENT_AGE_BANDS,
  HUB_TILE_AGE_MONTHS,
  partitionTilesByBand,
} from "../app/(tabs)/hub-bands";
import {
  WEB_HUB_TILES,
  computeWebSection1Tiles,
  bandIndexToWebLabel,
  MOBILE_ONLY_EXTRAS,
} from "../lib/hubWebReference";

describe("getAgeBand", () => {
  it("maps representative ages to the correct band index", () => {
    expect(getAgeBand(0, 0)).toBe(0);    // newborn
    expect(getAgeBand(1, 6)).toBe(0);    // 18m → 0–2
    expect(getAgeBand(2, 0)).toBe(1);    // exactly 24m → 2–4
    expect(getAgeBand(5, 0)).toBe(2);    // 5y → 4–6
    expect(getAgeBand(11, 0)).toBe(5);   // 11y → 10–12
    expect(getAgeBand(14, 0)).toBe(6);   // 14y → 12–15
  });

  it("clamps negative ages to band 0", () => {
    expect(getAgeBand(-1, 0)).toBe(0);
  });

  it("clamps ages past the last band to the final band", () => {
    expect(getAgeBand(20, 0)).toBe(HUB_AGE_BANDS.length - 1);
  });
});

describe("HUB_CONTENT_AGE_BANDS", () => {
  const tileEntries = Object.entries(HUB_CONTENT_AGE_BANDS);
  const validBandIndices: number[] = HUB_AGE_BANDS.map((b) => b.idx);
  const minBand = 0;
  const maxBand = HUB_AGE_BANDS.length - 1;

  it("only references valid band indices (0–6)", () => {
    for (const [tileId, bands] of tileEntries) {
      for (const b of bands) {
        expect(
          validBandIndices.includes(b),
          `tile "${tileId}" references invalid band ${b}`,
        ).toBe(true);
        expect(Number.isInteger(b)).toBe(true);
        expect(b).toBeGreaterThanOrEqual(minBand);
        expect(b).toBeLessThanOrEqual(maxBand);
      }
    }
  });

  it("gives every tile at least one band", () => {
    for (const [tileId, bands] of tileEntries) {
      expect(
        bands.length,
        `tile "${tileId}" has no age bands`,
      ).toBeGreaterThan(0);
    }
  });

  // Locks the tile inventory so an accidental deletion (or addition) of a
  // tile from HUB_CONTENT_AGE_BANDS is caught instead of silently shipping.
  // Inventory updated for #176: removed `phonics-test`; added `phonics`,
  // `smart-math-tricks`, `coloring-books`, `fun-sheets`.
  it("contains the expected 23 tiles", () => {
    const expectedIds = [
      // Always-current
      "amy", "articles", "tips", "emotional", "activities", "art-craft",
      "nutrition", "meal-suggestions",
      // Band-restricted (web parity)
      "story-hub", "phonics", "smart-math-tricks", "ptm-prep", "smart-study",
      "event-prep", "olympiad", "life-skills", "coloring-books", "fun-sheets",
      // Mobile-only extras
      "morning-flow", "kids-control-center", "meals", "worksheets", "facts",
    ].sort();
    const actualIds = Object.keys(HUB_CONTENT_AGE_BANDS).sort();
    expect(actualIds).toEqual(expectedIds);
    expect(actualIds.length).toBe(23);
  });

  // Locks expected tile membership for two representative bands. This catches
  // the case where someone accidentally drops the child's current band from a
  // tile (e.g. removing 0 from "amy") — the structural invariants would still
  // hold but the user-visible tile set would silently change.
  it("Section 1 for band 0 (0–2) contains the expected tiles", () => {
    const band = 0;
    const expected = [
      // All-current always render here
      "amy", "articles", "tips", "emotional", "activities", "art-craft",
      "nutrition", "meal-suggestions",
      // Band-restricted that include band 0
      "story-hub",
    ].sort();
    const section1Ids = Object.entries(HUB_CONTENT_AGE_BANDS)
      .filter(([, bands]) => bands.includes(band))
      .map(([id]) => id)
      .sort();
    expect(section1Ids).toEqual(expected);
  });

  it("Section 1 for band 4 (8–10) contains the expected tiles", () => {
    const band = 4;
    const expected = [
      // All-current
      "amy", "articles", "tips", "emotional", "activities", "art-craft",
      "nutrition", "meal-suggestions",
      // Band-restricted that include band 4
      "ptm-prep", "smart-study", "event-prep", "olympiad", "life-skills",
      "coloring-books", "fun-sheets",
      // Mobile-only extras that include band 4
      "morning-flow", "kids-control-center", "meals", "worksheets", "facts",
    ].sort();
    const section1Ids = Object.entries(HUB_CONTENT_AGE_BANDS)
      .filter(([, bands]) => bands.includes(band))
      .map(([id]) => id)
      .sort();
    expect(section1Ids).toEqual(expected);
  });
});

describe("HUB_TILE_AGE_MONTHS", () => {
  it("only references known tile ids", () => {
    const tileIds = new Set(Object.keys(HUB_CONTENT_AGE_BANDS));
    for (const id of Object.keys(HUB_TILE_AGE_MONTHS)) {
      expect(
        tileIds.has(id),
        `HUB_TILE_AGE_MONTHS references unknown tile "${id}"`,
      ).toBe(true);
    }
  });

  it("matches the web age-month bounds for each gated tile", () => {
    // These bounds come from the per-section guards in
    // artifacts/kidschedule/src/pages/parenting-hub.tsx — keep both files
    // in lockstep when the web rules change.
    expect(HUB_TILE_AGE_MONTHS["phonics"]).toEqual({ min: 12, max: 72 });
    expect(HUB_TILE_AGE_MONTHS["ptm-prep"]).toEqual({ min: 36, max: 216 });
    expect(HUB_TILE_AGE_MONTHS["smart-study"]).toEqual({ min: 36, max: 204 });
    expect(HUB_TILE_AGE_MONTHS["event-prep"]).toEqual({ min: 36, max: 180 });
    expect(HUB_TILE_AGE_MONTHS["olympiad"]).toEqual({ min: 36, max: 192 });
    expect(HUB_TILE_AGE_MONTHS["life-skills"]).toEqual({ min: 24, max: 192 });
    expect(HUB_TILE_AGE_MONTHS["coloring-books"]).toEqual({ min: 24 });
    expect(HUB_TILE_AGE_MONTHS["fun-sheets"]).toEqual({ min: 24 });
  });
});

describe("partitionTilesByBand", () => {
  // Exercise the real production helper used by hub.tsx so any regression
  // in the partition rule (e.g. Section 2 accidentally including past-only
  // tiles, or "Coming Up Next" pinning to the wrong band) is caught here
  // instead of slipping past a parallel-implementation test.
  type Tile = {
    id: string;
    ageBands: readonly number[];
    ageMonthsMin?: number;
    ageMonthsMax?: number;
  };
  const allTiles: Tile[] = Object.entries(HUB_CONTENT_AGE_BANDS).map(
    ([id, ageBands]) => ({
      id,
      ageBands,
      ageMonthsMin: HUB_TILE_AGE_MONTHS[id]?.min,
      ageMonthsMax: HUB_TILE_AGE_MONTHS[id]?.max,
    }),
  );
  const allBandIds = HUB_AGE_BANDS.map((b) => b.idx);

  for (const band of allBandIds) {
    const label = HUB_AGE_BANDS[band].label;

    it(`band ${band} (${label}): Section 1 and Section 2 are disjoint`, () => {
      const { section1, section2 } = partitionTilesByBand(allTiles, band);
      const s2ids = new Set(section2.map((t) => t.id));
      const overlap = section1.filter((t) => s2ids.has(t.id)).map((t) => t.id);
      expect(overlap, `tiles in both sections for band ${band}`).toEqual([]);
    });

    it(`band ${band} (${label}): Section 1 ∪ Section 2 ∪ hidden covers every tile exactly once`, () => {
      const { section1, section2, hidden } = partitionTilesByBand(
        allTiles,
        band,
      );
      const ids = [
        ...section1.map((t) => t.id),
        ...section2.map((t) => t.id),
        ...hidden.map((t) => t.id),
      ];
      expect(ids.length).toBe(allTiles.length);
      expect(new Set(ids).size).toBe(allTiles.length);
      expect(new Set(ids)).toEqual(new Set(allTiles.map((t) => t.id)));
    });

    it(`band ${band} (${label}): Section 1 contains exactly the tiles that include the current band (no month gates)`, () => {
      const { section1 } = partitionTilesByBand(allTiles, band);
      const expected = allTiles
        .filter((t) => t.ageBands.includes(band))
        .map((t) => t.id)
        .sort();
      expect(section1.map((t) => t.id).sort()).toEqual(expected);
    });

    it(`band ${band} (${label}): Section 2 only ever contains future-bearing tiles that don't cover the current band`, () => {
      const { section2 } = partitionTilesByBand(allTiles, band);
      for (const tile of section2) {
        expect(
          tile.ageBands.includes(band),
          `tile "${tile.id}" in Section 2 also covers current band ${band}`,
        ).toBe(false);
        expect(
          tile.ageBands.some((b) => b > band),
          `tile "${tile.id}" in Section 2 has no future band > ${band}`,
        ).toBe(true);
      }
    });

    it(`band ${band} (${label}): hidden tiles have no current and no future band (ignoring month gates)`, () => {
      const { hidden } = partitionTilesByBand(allTiles, band);
      for (const tile of hidden) {
        expect(
          tile.ageBands.includes(band),
          `hidden tile "${tile.id}" unexpectedly covers current band ${band}`,
        ).toBe(false);
        expect(
          tile.ageBands.some((b) => b > band),
          `hidden tile "${tile.id}" unexpectedly has a future band`,
        ).toBe(false);
      }
    });

    it(`band ${band} (${label}): groupsByFutureBand keys are all strictly > current band and tiles appear in exactly one group`, () => {
      const { section2, groupsByFutureBand } = partitionTilesByBand(
        allTiles,
        band,
      );
      const seen = new Set<string>();
      for (const [futureBand, tiles] of groupsByFutureBand) {
        expect(
          futureBand,
          `groupsByFutureBand key ${futureBand} is not strictly future`,
        ).toBeGreaterThan(band);
        for (const tile of tiles) {
          expect(
            seen.has(tile.id),
            `tile "${tile.id}" appears in more than one future group`,
          ).toBe(false);
          seen.add(tile.id);
        }
      }
      // Every Section 2 tile must land in some group, and only Section 2
      // tiles ever land in groups.
      expect(seen).toEqual(new Set(section2.map((t) => t.id)));
    });

    it(`band ${band} (${label}): each Section 2 tile sits under its smallest future band`, () => {
      const { groupsByFutureBand } = partitionTilesByBand(allTiles, band);
      for (const [futureBand, tiles] of groupsByFutureBand) {
        for (const tile of tiles) {
          const expected = Math.min(
            ...tile.ageBands.filter((b) => b > band),
          );
          expect(
            futureBand,
            `tile "${tile.id}" placed under band ${futureBand} but its nearest future band is ${expected}`,
          ).toBe(expected);
        }
      }
    });

    it(`band ${band} (${label}): nearestFutureBand and isLatestStage agree with groupsByFutureBand`, () => {
      const { groupsByFutureBand, nearestFutureBand, isLatestStage } =
        partitionTilesByBand(allTiles, band);
      const keys = [...groupsByFutureBand.keys()].sort((a, b) => a - b);
      if (keys.length === 0) {
        expect(nearestFutureBand).toBeNull();
        expect(isLatestStage).toBe(true);
      } else {
        expect(nearestFutureBand).toBe(keys[0]);
        expect(isLatestStage).toBe(false);
      }
    });
  }

  it("returns the original tile objects (preserving extra fields like `node`)", () => {
    // The helper is generic over T; callers attach a rendered React node to
    // each tile and rely on it surviving the partition.
    const marker = Symbol("node");
    const tiles = [
      { id: "amy", ageBands: [0, 1] as const, node: marker },
      { id: "olympiad", ageBands: [3, 4] as const, node: marker },
    ];
    const { section1, section2 } = partitionTilesByBand(tiles, 0);
    expect(section1[0].node).toBe(marker);
    expect(section2[0].node).toBe(marker);
  });

  it("treats the last band as 'latest stage' (no future content)", () => {
    const lastBand = HUB_AGE_BANDS.length - 1;
    const { isLatestStage, nearestFutureBand, section2 } =
      partitionTilesByBand(allTiles, lastBand);
    expect(isLatestStage).toBe(true);
    expect(nearestFutureBand).toBeNull();
    expect(section2).toEqual([]);
  });

  it("hides tiles whose ageMonths bounds exclude the child", () => {
    // phonics: bands [1,2] but ageMonthsMin=12, ageMonthsMax=72.
    // For a 6-month-old in band 0 the ageMonths bound excludes phonics so
    // it should land in `hidden` rather than Section 2.
    const tiles = [
      { id: "phonics", ageBands: [1, 2] as const, ageMonthsMin: 12, ageMonthsMax: 72 },
      { id: "amy", ageBands: [0, 1, 2] as const },
    ];
    const { section1, section2, hidden } = partitionTilesByBand(tiles, 0, 6);
    expect(section1.map((t) => t.id)).toEqual(["amy"]);
    expect(section2.map((t) => t.id)).toEqual([]);
    expect(hidden.map((t) => t.id)).toEqual(["phonics"]);
  });

  it("treats a missing ageMonths argument as 'no month gating'", () => {
    const tiles = [
      { id: "phonics", ageBands: [1, 2] as const, ageMonthsMin: 12, ageMonthsMax: 72 },
    ];
    // No ageMonths passed → bounds are ignored, tile follows band rules
    // (band 0 means it lands in Section 2).
    const { section2 } = partitionTilesByBand(tiles, 0);
    expect(section2.map((t) => t.id)).toEqual(["phonics"]);
  });
});

describe("Mobile vs web parity (per-band tile inventory)", () => {
  // This is the headline parity check #176 introduces: for every band, the
  // canonical (web-comparable) mobile Section 1 ids must match what the web
  // hub would render for an age in the middle of that band. Mobile-only
  // documented extras (MOBILE_ONLY_EXTRAS) are filtered out before
  // comparing — they're an intentional product addition.
  type Tile = {
    id: string;
    ageBands: readonly number[];
    ageMonthsMin?: number;
    ageMonthsMax?: number;
  };
  const allTiles: Tile[] = Object.entries(HUB_CONTENT_AGE_BANDS).map(
    ([id, ageBands]) => ({
      id,
      ageBands,
      ageMonthsMin: HUB_TILE_AGE_MONTHS[id]?.min,
      ageMonthsMax: HUB_TILE_AGE_MONTHS[id]?.max,
    }),
  );

  for (let band = 0; band < HUB_AGE_BANDS.length; band++) {
    const meta = HUB_AGE_BANDS[band];
    // Pick an age in the middle of the band so age-month gates apply.
    const ageMonths = Math.floor((meta.minMonths + meta.maxMonths) / 2);
    const webBand = bandIndexToWebLabel(band);

    it(`band ${band} (${meta.label}): mobile Section 1 ids equal web Section 1 ids`, () => {
      const { section1 } = partitionTilesByBand(allTiles, band, ageMonths);
      const mobileIds = section1
        .map((t) => t.id)
        .filter((id) => !MOBILE_ONLY_EXTRAS.has(id))
        .sort();

      // Featured tiles (command-center, infant-hub, tomorrow-forecast) are
      // rendered above the partitioned grid on both platforms — exclude
      // them from the comparison since they're not in HUB_CONTENT_AGE_BANDS.
      const featuredIds = new Set(
        WEB_HUB_TILES.filter((t) => t.featured).map((t) => t.id),
      );
      const webIds = computeWebSection1Tiles(webBand, ageMonths)
        .filter((t) => !featuredIds.has(t.id))
        .map((t) => t.id)
        .sort();

      expect(mobileIds).toEqual(webIds);
    });
  }
});
