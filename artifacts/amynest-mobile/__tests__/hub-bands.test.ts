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
import {
  SECTION_KEYS,
  TILE_SECTION_MAP,
  FEATURED_TILE_IDS,
  bucketTilesBySection,
  isFeaturedTile,
  assertTileSectionMapCoversAllBandTiles,
  ROUTINE_CATEGORY_TO_TILE_ID,
  routineCategoryToTileId,
  tileIdToSection,
  sectionCtaLabel,
} from "../app/(tabs)/hub-sections";

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
  // Inventory updated for #197: added `skills-focus`, `daily-story`,
  // `daily-puzzle` (web-parity tiles ported from kidschedule's dashboard).
  // Inventory updated for #214: added `abacus` (Abacus PRO Zone, ages 4–10).
  it("contains the expected 27 tiles", () => {
    const expectedIds = [
      // Always-current
      "amy", "articles", "tips", "emotional", "activities", "art-craft",
      "nutrition", "meal-suggestions",
      // Band-restricted (web parity)
      "story-hub", "phonics", "smart-math-tricks", "abacus", "ptm-prep",
      "smart-study", "event-prep", "olympiad", "life-skills",
      "coloring-books", "fun-sheets",
      // Mobile-only extras
      "morning-flow", "kids-control-center", "meals", "worksheets", "facts",
      // Task #197 web-parity additions
      "skills-focus", "daily-story", "daily-puzzle",
    ].sort();
    const actualIds = Object.keys(HUB_CONTENT_AGE_BANDS).sort();
    expect(actualIds).toEqual(expectedIds);
    expect(actualIds.length).toBe(27);
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
      // Mobile-only AmazingFacts now extends to the InfantHub band (0–2y)
      // — task #196.
      "facts",
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
      "abacus", "ptm-prep", "smart-study", "event-prep", "olympiad",
      "life-skills", "coloring-books", "fun-sheets",
      // Mobile-only extras that include band 4
      "morning-flow", "kids-control-center", "meals", "worksheets", "facts",
      // Task #197 web-parity additions that include band 4
      "skills-focus", "daily-story", "daily-puzzle",
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
    // Task #197 — Daily Puzzle is gated to ages 3+ (preschool difficulty
    // is the lowest tier in the question bank).
    expect(HUB_TILE_AGE_MONTHS["daily-puzzle"]).toEqual({ min: 36 });
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

// ─────────────────────────────────────────────────────────────────────────────
// 4-section taxonomy (task #187): every tile in HUB_CONTENT_AGE_BANDS must
// belong to exactly one of the 4 hub sections (today / zones / modules /
// activities). The "today" section never appears in TILE_SECTION_MAP because
// it's built from the routine cache, not from band tiles.
// ─────────────────────────────────────────────────────────────────────────────
describe("hub-sections taxonomy", () => {
  it("declares the 4 expected section keys in pager order", () => {
    expect(SECTION_KEYS).toEqual(["today", "zones", "modules", "activities"]);
  });

  it("covers every tile id in HUB_CONTENT_AGE_BANDS", () => {
    expect(() => assertTileSectionMapCoversAllBandTiles()).not.toThrow();
  });

  it("maps every band-tile id to exactly one section (zones/modules/activities)", () => {
    const bandIds = Object.keys(HUB_CONTENT_AGE_BANDS);
    for (const id of bandIds) {
      const section = TILE_SECTION_MAP[id];
      expect(section, `missing section for tile ${id}`).toBeDefined();
      expect(["zones", "modules", "activities"]).toContain(section);
    }
  });

  it("flags featured tile ids correctly", () => {
    for (const id of FEATURED_TILE_IDS) {
      expect(isFeaturedTile(id)).toBe(true);
    }
    expect(isFeaturedTile("amy")).toBe(false);
    expect(isFeaturedTile("activities")).toBe(false);
  });

  it("buckets a sample tile list into the correct sections in order", () => {
    const tiles = [
      { id: "amy" },
      { id: "phonics" },
      { id: "art-craft" },
      { id: "articles" },
      { id: "olympiad" },
      { id: "morning-flow" },
    ];
    const buckets = bucketTilesBySection(tiles);
    expect(buckets.zones.map((t) => t.id)).toEqual(["amy", "articles"]);
    expect(buckets.modules.map((t) => t.id)).toEqual(["phonics", "olympiad"]);
    expect(buckets.activities.map((t) => t.id)).toEqual(["art-craft", "morning-flow"]);
    expect(buckets.unmapped).toEqual([]);
  });

  it("collects unknown tile ids into `unmapped`", () => {
    const buckets = bucketTilesBySection([{ id: "amy" }, { id: "totally-fake-id" }]);
    expect(buckets.unmapped.map((t) => t.id)).toEqual(["totally-fake-id"]);
    expect(buckets.zones.map((t) => t.id)).toEqual(["amy"]);
  });

  it("for every age band, union of zones+modules+activities equals partitionTilesByBand's section1 minus featured", () => {
    // The strict per-band invariant: feed a synthetic tile inventory
    // (one tile per HUB_CONTENT_AGE_BANDS id) into partitionTilesByBand,
    // then bucket the section1 result by section. The combined set of
    // bucket ids — minus featured — must exactly equal section1's
    // non-featured tile ids. If a tile is mapped to NO section, it would
    // silently disappear from the new pager UI; this test catches that.
    type SyntheticTile = {
      id: string;
      ageBands: readonly number[];
      node: null;
    };
    const inventory: SyntheticTile[] = Object.entries(HUB_CONTENT_AGE_BANDS).map(
      ([id, ageBands]) => ({ id, ageBands, node: null }),
    );

    for (let band = 0; band < HUB_AGE_BANDS.length; band++) {
      const ageMonths = HUB_AGE_BANDS[band].minMonths + 1;
      const { section1 } = partitionTilesByBand(inventory, band, ageMonths);

      const buckets = bucketTilesBySection(section1);
      // `unmapped` MUST be empty — every tile reachable in the band must
      // have a section.
      expect(
        buckets.unmapped.map((t) => t.id),
        `band ${band} (${HUB_AGE_BANDS[band].label}) has tiles with no section assignment`,
      ).toEqual([]);

      const unionIds = [
        ...buckets.zones.map((t) => t.id),
        ...buckets.modules.map((t) => t.id),
        ...buckets.activities.map((t) => t.id),
      ].sort();
      const sectionIds = section1.map((t) => t.id).sort();
      expect(
        unionIds,
        `band ${band} (${HUB_AGE_BANDS[band].label}) union of buckets must equal section1`,
      ).toEqual(sectionIds);
    }
  });

  it("union of all band tiles + featured tiles equals every section-1 web tile id", () => {
    // Sanity: every web Section-1 tile id (across all bands) must either be
    // a featured tile OR appear in TILE_SECTION_MAP, otherwise we'd silently
    // drop it from the mobile pager.
    const allWebIds = new Set<string>();
    for (let band = 0; band < HUB_AGE_BANDS.length; band++) {
      const ageMonths = HUB_AGE_BANDS[band].minMonths + 1;
      const webBand = bandIndexToWebLabel(band);
      for (const tile of computeWebSection1Tiles(webBand, ageMonths)) {
        allWebIds.add(tile.id);
      }
    }
    const knownIds = new Set<string>([
      ...Object.keys(TILE_SECTION_MAP),
      ...FEATURED_TILE_IDS,
      // Mobile-only extras and web-only extras are tolerated; we only need
      // the intersection (web ids that are also rendered on mobile) to be
      // covered.
    ]);
    const missing = Array.from(allWebIds).filter(
      (id) => !knownIds.has(id) && !MOBILE_ONLY_EXTRAS.has(id),
    );
    // It's OK to have web-only ids missing on mobile — those are tracked
    // by the existing parity test above. We just want to flag any web id
    // that *would* render on mobile (via HUB_CONTENT_AGE_BANDS) but lacks
    // a section mapping.
    const renderableButUnmapped = missing.filter(
      (id) => id in HUB_CONTENT_AGE_BANDS,
    );
    expect(renderableButUnmapped).toEqual([]);
  });
});

/**
 * Sibling assertions for the Interactive Command Center (task #188).
 *
 * The Parent Hub mounts the Command Center as a *featured* tile
 * (HubTile testID="hub-tile-command-center") above the partitioned grid,
 * sitting next to `infant-hub` and `tomorrow-forecast`. These checks lock
 * that arrangement so a refactor can't accidentally drop the CC tile or
 * push it back into the regular grid (which would silently break the
 * fullscreen-modal entry point on the Hub).
 */
describe("FEATURED_TILE_IDS — command-center sibling assertions", () => {
  it("includes 'command-center' as a featured tile", () => {
    expect((FEATURED_TILE_IDS as readonly string[]).includes("command-center")).toBe(true);
  });

  it("places 'command-center' alongside 'infant-hub' and 'tomorrow-forecast'", () => {
    // Locking the exact featured set keeps the Recommended Zones header
    // free of surprise additions; a new featured tile must update both
    // this constant and this assertion together.
    expect([...FEATURED_TILE_IDS].sort()).toEqual(
      ["command-center", "infant-hub", "tomorrow-forecast"].sort(),
    );
  });

  it("flags 'command-center' as featured (not in the partitioned grid)", () => {
    // Featured tiles must NOT appear in TILE_SECTION_MAP — that map is
    // only for grid tiles. If someone moves CC into the grid by mistake,
    // it would render twice (once featured, once in zones).
    expect("command-center" in TILE_SECTION_MAP).toBe(false);
    expect(isFeaturedTile("command-center")).toBe(true);
  });
});

describe("ROUTINE_CATEGORY_TO_TILE_ID + routineCategoryToTileId", () => {
  it("maps the documented categories to known tile ids", () => {
    expect(routineCategoryToTileId("homework")).toBe("smart-study");
    expect(routineCategoryToTileId("study")).toBe("smart-study");
    expect(routineCategoryToTileId("reading")).toBe("story-hub");
    expect(routineCategoryToTileId("creative")).toBe("art-craft");
    expect(routineCategoryToTileId("play")).toBe("activities");
    expect(routineCategoryToTileId("outdoor")).toBe("activities");
    expect(routineCategoryToTileId("meal")).toBe("meals");
    expect(routineCategoryToTileId("tiffin")).toBe("meals");
    expect(routineCategoryToTileId("snack")).toBe("meals");
    expect(routineCategoryToTileId("exercise")).toBe("life-skills");
    expect(routineCategoryToTileId("morning")).toBe("morning-flow");
    expect(routineCategoryToTileId("morning_routine")).toBe("morning-flow");
    expect(routineCategoryToTileId("bonding")).toBe("tips");
    expect(routineCategoryToTileId("family")).toBe("tips");
  });

  it("is case-insensitive", () => {
    expect(routineCategoryToTileId("HOMEWORK")).toBe("smart-study");
    expect(routineCategoryToTileId("Reading")).toBe("story-hub");
    expect(routineCategoryToTileId("MEAL")).toBe("meals");
  });

  it("returns null for unmapped, missing, or unmappable categories", () => {
    // Categories intentionally omitted from the map (no sensible tile target)
    expect(routineCategoryToTileId("school")).toBeNull();
    expect(routineCategoryToTileId("sleep")).toBeNull();
    expect(routineCategoryToTileId("hygiene")).toBeNull();
    expect(routineCategoryToTileId("rest")).toBeNull();
    expect(routineCategoryToTileId("travel")).toBeNull();
    expect(routineCategoryToTileId("screen")).toBeNull();
    // Falsy / unknown
    expect(routineCategoryToTileId(null)).toBeNull();
    expect(routineCategoryToTileId(undefined)).toBeNull();
    expect(routineCategoryToTileId("")).toBeNull();
    expect(routineCategoryToTileId("totally-unknown-cat")).toBeNull();
  });

  it("every tile id in the routine→tile map is a real tile in TILE_SECTION_MAP", () => {
    // If a value here ever points to a tile that doesn't exist in the
    // section map, the quick-jump would resolve to a dead section. The
    // SectionPage scroll target would also fail silently. Lock that down.
    for (const [category, tileId] of Object.entries(ROUTINE_CATEGORY_TO_TILE_ID)) {
      expect(
        TILE_SECTION_MAP[tileId],
        `${category} → ${tileId} must resolve to a section`,
      ).toBeDefined();
    }
  });
});

describe("tileIdToSection", () => {
  it("returns the correct section for tiles in each bucket", () => {
    expect(tileIdToSection("amy")).toBe("zones");
    expect(tileIdToSection("tips")).toBe("zones");
    expect(tileIdToSection("phonics")).toBe("modules");
    expect(tileIdToSection("smart-study")).toBe("modules");
    expect(tileIdToSection("story-hub")).toBe("modules");
    expect(tileIdToSection("activities")).toBe("activities");
    expect(tileIdToSection("art-craft")).toBe("activities");
    expect(tileIdToSection("meals")).toBe("activities");
    expect(tileIdToSection("morning-flow")).toBe("activities");
  });

  it("returns null for featured tiles (not part of the partitioned grid)", () => {
    // Featured tiles render above the grid as standalone cards and do
    // not belong to any bucket — quick-jumps should treat them as
    // unmappable so the link doesn't render.
    expect(tileIdToSection("command-center")).toBeNull();
    expect(tileIdToSection("infant-hub")).toBeNull();
    expect(tileIdToSection("tomorrow-forecast")).toBeNull();
  });

  it("returns null for unknown / falsy ids", () => {
    expect(tileIdToSection(null)).toBeNull();
    expect(tileIdToSection(undefined)).toBeNull();
    expect(tileIdToSection("")).toBeNull();
    expect(tileIdToSection("does-not-exist")).toBeNull();
  });
});

describe("sectionCtaLabel", () => {
  it("returns user-facing labels for each grid section", () => {
    expect(sectionCtaLabel("modules")).toBe("Open in Modules");
    expect(sectionCtaLabel("activities")).toBe("Open in Activities");
    expect(sectionCtaLabel("zones")).toBe("Open in Zones");
  });
});
