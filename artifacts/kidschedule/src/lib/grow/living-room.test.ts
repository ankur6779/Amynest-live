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
