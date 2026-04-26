/**
 * Hub age-band metadata tests
 *
 * Locks in the contract behind the Parent Hub's 2-section, 7-band layout
 * (introduced in task #107). These tests catch regressions in the band
 * configuration without needing to mount the full Hub screen — for example,
 * if someone edits a tile's `ageBands` array and accidentally drops the
 * child's current band, or if a tile ends up assigned to both Section 1 and
 * Section 2 for some band.
 */
import { describe, it, expect } from "vitest";
import {
  HUB_AGE_BANDS,
  getAgeBand,
  HUB_CONTENT_AGE_BANDS,
} from "./hub-bands";

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
  it("contains the expected 19 tiles", () => {
    const expectedIds = [
      "amy", "articles", "tips", "emotional", "ptm-prep", "smart-study",
      "morning-flow", "olympiad", "kids-control-center", "meals", "nutrition",
      "event-prep", "activities", "story-hub", "art-craft", "worksheets",
      "facts", "life-skills", "meal-suggestions",
    ].sort();
    const actualIds = Object.keys(HUB_CONTENT_AGE_BANDS).sort();
    expect(actualIds).toEqual(expectedIds);
    expect(actualIds.length).toBe(19);
  });

  // Locks expected tile membership for two representative bands. This catches
  // the case where someone accidentally drops the child's current band from a
  // tile (e.g. removing 0 from "amy") — the structural invariants would still
  // hold but the user-visible tile set would silently change.
  it("Section 1 for band 0 (0–2) contains the expected tiles", () => {
    const band = 0;
    const expected = [
      "amy", "articles", "tips", "emotional", "nutrition", "activities",
      "meal-suggestions",
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
      "amy", "articles", "tips", "emotional", "ptm-prep", "smart-study",
      "morning-flow", "olympiad", "kids-control-center", "meals", "nutrition",
      "event-prep", "activities", "story-hub", "art-craft", "worksheets",
      "facts", "life-skills", "meal-suggestions",
    ].sort();
    const section1Ids = Object.entries(HUB_CONTENT_AGE_BANDS)
      .filter(([, bands]) => bands.includes(band))
      .map(([id]) => id)
      .sort();
    expect(section1Ids).toEqual(expected);
  });
});

describe("Hub section partition", () => {
  // Mirrors the partitioning rule used in hub.tsx so the test acts as the
  // contract: a tile belongs in Section 1 ("For You") when its ageBands
  // include the current band, and in Section 2 ("Explore Next Stage") when
  // it has at least one strictly-future band but does not cover the current
  // band. Tiles whose bands are all in the past are intentionally hidden.
  type Tile = { id: string; ageBands: readonly number[] };
  const allTiles: Tile[] = Object.entries(HUB_CONTENT_AGE_BANDS).map(
    ([id, ageBands]) => ({ id, ageBands }),
  );

  const partition = (currentBand: number) => {
    const section1 = allTiles.filter((t) => t.ageBands.includes(currentBand));
    const section2 = allTiles.filter(
      (t) =>
        !t.ageBands.includes(currentBand) &&
        t.ageBands.some((b) => b > currentBand),
    );
    const hidden = allTiles.filter(
      (t) =>
        !t.ageBands.includes(currentBand) &&
        !t.ageBands.some((b) => b > currentBand),
    );
    return { section1, section2, hidden };
  };

  for (const band of HUB_AGE_BANDS.map((b) => b.idx)) {
    it(`band ${band} (${HUB_AGE_BANDS[band].label}): Section 1 and Section 2 are disjoint`, () => {
      const { section1, section2 } = partition(band);
      const s2ids = new Set(section2.map((t) => t.id));
      const overlap = section1.filter((t) => s2ids.has(t.id)).map((t) => t.id);
      expect(overlap, `tiles in both sections for band ${band}`).toEqual([]);
    });

    it(`band ${band} (${HUB_AGE_BANDS[band].label}): Section 1 ∪ Section 2 ∪ hidden covers every tile exactly once`, () => {
      const { section1, section2, hidden } = partition(band);
      const ids = [
        ...section1.map((t) => t.id),
        ...section2.map((t) => t.id),
        ...hidden.map((t) => t.id),
      ];
      expect(ids.length).toBe(allTiles.length);
      expect(new Set(ids).size).toBe(allTiles.length);
      expect(new Set(ids)).toEqual(new Set(allTiles.map((t) => t.id)));
    });
  }
});
