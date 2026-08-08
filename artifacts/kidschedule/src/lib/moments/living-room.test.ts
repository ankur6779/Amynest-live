import { describe, expect, it } from "vitest";
import {
  MOMENTS_QUIET_PATHS,
  MOMENTS_STREAM_TILE_ID,
  isMomentsLivingV1Enabled,
  momentsDeepenCueForTile,
  momentsPathForTile,
  recommendMomentsAction,
  tileIdForMomentsPath,
} from "./living-room";

describe("moments living-room", () => {
  it("orders one emotional room — Talking Amy never leads", () => {
    expect(MOMENTS_QUIET_PATHS.map((p) => p.id)).toEqual([
      "presence",
      "story",
      "make",
      "talking-amy",
    ]);
    expect(MOMENTS_QUIET_PATHS[0]?.id).toBe("presence");
    expect(MOMENTS_QUIET_PATHS[MOMENTS_QUIET_PATHS.length - 1]?.id).toBe(
      "talking-amy",
    );
    expect(MOMENTS_QUIET_PATHS[MOMENTS_QUIET_PATHS.length - 1]?.demoted).toBe(
      true,
    );
  });

  it("deepen cues stay one-room — never four-product language", () => {
    const cue = momentsDeepenCueForTile("story-hub");
    expect(cue?.title).toBe("One story");
    expect(momentsDeepenCueForTile("origami-studio")?.title).toBe(
      "Fold together",
    );
    expect(momentsDeepenCueForTile("amy-ai")).toBeNull();
  });

  it("recommends ten minutes together", () => {
    const r = recommendMomentsAction("Emma");
    expect(r.pathId).toBe("presence");
    expect(r.tileId).toBe("activities");
    expect(r.title).toContain("Emma");
  });

  it("maps legacy tiles to living paths", () => {
    expect(momentsPathForTile("activities")).toBe("presence");
    expect(momentsPathForTile("story-hub")).toBe("story");
    expect(momentsPathForTile("coloring-books")).toBe("make");
    expect(momentsPathForTile("talking-amy")).toBe("talking-amy");
    expect(momentsPathForTile("amy-ai")).toBeNull();
  });

  it("resolves primary tile per path", () => {
    expect(tileIdForMomentsPath("story")).toBe("story-hub");
    expect(tileIdForMomentsPath("make")).toBe("worksheets");
  });

  it("living flag defaults ON", () => {
    expect(isMomentsLivingV1Enabled()).toBe(true);
  });

  it("exposes stable stream tile id", () => {
    expect(MOMENTS_STREAM_TILE_ID).toBe("__moments_stream__");
  });
});
