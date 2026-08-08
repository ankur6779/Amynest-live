import { describe, expect, it } from "vitest";
import {
  GROW_QUIET_PATHS,
  GROW_STREAM_TILE_ID,
  growDeepenCueForTile,
  growPathForTile,
  growPathsForAge,
  isGrowLivingV1Enabled,
  isGrowTileId,
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
  });

  it("maps legacy tiles and age filters", () => {
    expect(growPathForTile("abacus")).toBe("beads");
    expect(isGrowTileId("olympiad")).toBe(true);
    expect(isGrowTileId("daily-tips")).toBe(false);
    const youngPaths = growPathsForAge(30).map((p) => p.id);
    expect(youngPaths).toContain("sounds");
    expect(youngPaths).not.toContain("challenge");
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
});
