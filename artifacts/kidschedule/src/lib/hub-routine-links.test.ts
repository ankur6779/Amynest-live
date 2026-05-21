import { describe, expect, it } from "vitest";
import {
  hubJumpForCategory,
  hubTileHref,
  pickDashboardHubRecommendations,
  routineCategoryToTileId,
} from "./hub-routine-links";

describe("hub-routine-links", () => {
  it("maps routine categories to web tile ids", () => {
    expect(routineCategoryToTileId("reading")).toBe("story-hub");
    expect(routineCategoryToTileId("HOMEWORK")).toBe("smart-study");
    expect(routineCategoryToTileId("school")).toBeNull();
  });

  it("resolves hub hrefs for direct and hash routes", () => {
    expect(hubTileHref("phonics")).toBe("/phonics");
    expect(hubTileHref("story-hub")).toBe("/parenting-hub#story-hub");
  });

  it("returns hub jump only for known web tiles", () => {
    expect(hubJumpForCategory("reading")?.tileId).toBe("story-hub");
    expect(hubJumpForCategory("meal")).toBeNull();
  });

  it("picks age-appropriate dashboard recommendations", () => {
    const infant = pickDashboardHubRecommendations(0, 6);
    expect(infant.length).toBeGreaterThan(0);
    expect(infant.some((p) => p.tileId === "infant-hub" || p.tileId === "daily-tips")).toBe(true);

    const school = pickDashboardHubRecommendations(7, 0);
    expect(school.some((p) => p.tileId === "smart-study" || p.tileId === "story-hub")).toBe(true);
  });
});
