import { describe, expect, it } from "vitest";
import {
  GROW_LIVING_DEEP_PALETTE,
  GROW_QUIET_PATHS,
  GROW_STREAM_TILE_ID,
  growDeepenCueForTile,
  growPathForTile,
  growPathsForAge,
  isGrowLeaveFeatureId,
  isGrowLivingV1Enabled,
  isGrowTileId,
  livingGrowAcademyEyebrow,
  livingGrowPageTitle,
  livingGrowPageTitleForFeature,
  livingGrowPremiumGateTitle,
  livingGrowPrimaryCta,
  livingGrowWorkbookPurpose,
  livingGrowWorkbookTitle,
  isGrowRecommendEnabled,
  recommendGrowAction,
} from "./living-room";

describe("grow living-room", () => {
  it("orders one educational room — challenge never leads", () => {
    expect(GROW_QUIET_PATHS.map((p) => p.id)).toEqual([
      "numbers",
      "beads",
      "sounds",
      "spelling",
      "study",
      "challenge",
    ]);
    expect(GROW_QUIET_PATHS[GROW_QUIET_PATHS.length - 1]?.demoted).toBe(true);
  });

  it("uses calm titles — not PRO / Zone / Mastery SKUs", () => {
    const titles = GROW_QUIET_PATHS.map((p) => p.title).join(" ");
    expect(titles.toLowerCase()).not.toContain("pro");
    expect(titles.toLowerCase()).not.toContain("zone");
    expect(titles.toLowerCase()).not.toContain("mastery");
    expect(titles.toLowerCase()).not.toContain("olympiad");
  });

  it("recommends practice — never challenge first", () => {
    const young = recommendGrowAction("Emma", 36);
    expect(young.tileId).toBe("phonics");
    expect(young.pathId).not.toBe("challenge");
    const older = recommendGrowAction("Emma", 84);
    expect(older.tileId).toBe("smart-math-tricks");
    expect(older.pathId).not.toBe("challenge");
    const newborn = recommendGrowAction("Emma", 6);
    expect(newborn.purpose.toLowerCase()).toMatch(/age 1|begins/);
  });

  it("applies Grow content floors at every published age boundary", () => {
    const cases: Array<{
      months: number;
      enabled: string[];
      disabled: string[];
      challenge: boolean;
    }> = [
      { months: 11, enabled: [], disabled: ["sounds", "numbers", "beads", "spelling", "study"], challenge: false },
      { months: 12, enabled: ["sounds"], disabled: ["numbers", "beads", "spelling", "study"], challenge: false },
      { months: 23, enabled: ["sounds"], disabled: ["numbers", "beads", "spelling", "study"], challenge: false },
      { months: 24, enabled: ["sounds", "numbers", "beads"], disabled: ["spelling", "study"], challenge: false },
      { months: 35, enabled: ["sounds", "numbers", "beads"], disabled: ["spelling", "study"], challenge: false },
      { months: 36, enabled: ["sounds", "numbers", "beads", "spelling"], disabled: ["study"], challenge: false },
      { months: 47, enabled: ["sounds", "numbers", "beads", "spelling"], disabled: ["study"], challenge: false },
      { months: 48, enabled: ["sounds", "numbers", "beads", "spelling", "study"], disabled: [], challenge: false },
      { months: 59, enabled: ["sounds", "numbers", "beads", "spelling", "study"], disabled: [], challenge: false },
      { months: 60, enabled: ["sounds", "numbers", "beads", "spelling", "study"], disabled: [], challenge: false },
      { months: 71, enabled: ["sounds", "numbers", "beads", "spelling", "study"], disabled: [], challenge: false },
      { months: 72, enabled: ["sounds", "numbers", "beads", "spelling", "study", "challenge"], disabled: [], challenge: true },
    ];

    for (const row of cases) {
      const paths = growPathsForAge(row.months);
      const ids = paths.map((p) => p.id);
      expect(ids, `${row.months}m listed`).toEqual(
        expect.arrayContaining(["sounds", "numbers", "beads", "spelling", "study"]),
      );
      expect(ids.includes("challenge"), `${row.months}m challenge`).toBe(row.challenge);
      for (const id of row.enabled) {
        expect(paths.find((p) => p.id === id)?.enabled, `${row.months}m ${id} on`).not.toBe(false);
      }
      for (const id of row.disabled) {
        expect(paths.find((p) => p.id === id)?.enabled, `${row.months}m ${id} off`).toBe(false);
        expect(paths.find((p) => p.id === id)?.disabledReason).toMatch(/ready|begins|age/i);
      }
    }

    expect(recommendGrowAction("Aria", 11).purpose).toMatch(/age 1|begins/i);
    expect(isGrowRecommendEnabled(11)).toBe(false);
    expect(isGrowRecommendEnabled(12)).toBe(true);
  });

  it("maps legacy tiles and age filters", () => {
    expect(growPathForTile("abacus")).toBe("beads");
    expect(isGrowTileId("olympiad")).toBe(true);
    expect(isGrowTileId("daily-tips")).toBe(false);
    const youngPaths = growPathsForAge(30);
    expect(youngPaths.map((p) => p.id)).toContain("sounds");
    expect(youngPaths.map((p) => p.id)).toContain("numbers");
    expect(youngPaths.map((p) => p.id)).not.toContain("challenge");
    expect(youngPaths.find((p) => p.id === "spelling")?.enabled).toBe(false);
    expect(youngPaths.find((p) => p.id === "study")?.enabled).toBe(false);
    const infantGrow = growPathsForAge(8);
    expect(infantGrow.find((p) => p.id === "sounds")?.enabled).toBe(false);
    expect(infantGrow.find((p) => p.id === "numbers")?.enabled).toBe(false);
    expect(infantGrow.map((p) => p.id)).toContain("sounds");
    expect(infantGrow.map((p) => p.id)).toContain("numbers");
  });

  it("deepen cues stay calm — never unlock theatre", () => {
    const cue = growDeepenCueForTile("abacus");
    expect(cue?.title).toBe("Beads & counting");
    expect(cue?.purpose.toLowerCase()).not.toContain("unlock");
    expect(growDeepenCueForTile("daily-tips")).toBeNull();
  });

  it("living flag defaults ON", () => {
    expect(isGrowLivingV1Enabled()).toBe(true);
    expect(GROW_STREAM_TILE_ID).toBe("__grow_stream__");
  });

  it("deep leave titles stay Care/Understand — never PRO / Academy / Unlock theatre", () => {
    expect(livingGrowPageTitle("beads")).toBe("Beads & counting");
    expect(livingGrowPageTitleForFeature("hub_abacus")).toBe("Beads & counting");
    expect(livingGrowPageTitle("sounds")).toBe("Sounds & letters");
    expect(livingGrowAcademyEyebrow()).toBe("Sounds & letters");
    expect(livingGrowPrimaryCta()).toBe("Begin gently");
    expect(isGrowLeaveFeatureId("hub_abacus")).toBe(true);
    expect(isGrowLeaveFeatureId("hub_phonics")).toBe(true);
    const joined = [
      livingGrowPageTitle("beads"),
      livingGrowAcademyEyebrow(),
      livingGrowPremiumGateTitle(),
      GROW_LIVING_DEEP_PALETTE.night,
    ]
      .join(" ")
      .toLowerCase();
    expect(joined).not.toMatch(/pro zone|reading academy|unlock all|olympiad zone|mastery/);
  });

  it("phonics workbook leave copy is not unlock theatre", () => {
    expect(livingGrowWorkbookTitle().toLowerCase()).not.toMatch(/unlock|premium|workbook sets/);
    expect(livingGrowWorkbookPurpose().toLowerCase()).not.toMatch(/unlock|paid premium|15 complete/);
  });
});
