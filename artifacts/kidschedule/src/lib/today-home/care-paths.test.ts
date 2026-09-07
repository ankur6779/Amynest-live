import { describe, expect, it } from "vitest";
import { buildTodayCarePaths, todayCarePathsHref } from "./care-paths";

describe("today-home care paths", () => {
  it("exposes four existing destinations in founder priority order", () => {
    const paths = buildTodayCarePaths(12);
    expect(paths.map((p) => p.id)).toEqual([
      "routines",
      "speech-coach",
      "amy",
      "rooms",
    ]);
    expect(paths[0]?.href).toBe("/routines");
    expect(paths[1]?.href).toBe("/speech-coach");
    expect(paths[2]?.href).toBe("/assistant");
    expect(paths[3]?.href).toBe("/parenting-hub");
  });

  it("does not invent destinations or attach childId to non-child routes", () => {
    expect(todayCarePathsHref("routines", 4)).toBe("/routines");
    expect(todayCarePathsHref("amy", 4)).toBe("/assistant");
    expect(todayCarePathsHref("rooms", 4)).toBe("/parenting-hub");
    expect(todayCarePathsHref("speech-coach")).toBe("/speech-coach");
  });
});
