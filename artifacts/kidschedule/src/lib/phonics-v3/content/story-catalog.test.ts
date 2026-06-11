import { describe, expect, it } from "vitest";
import { getDecodableStoryCatalog, getStoryCount, getStoriesForLevel } from "./story-catalog";

describe("story-catalog", () => {
  it("has 150+ decodable stories", () => {
    expect(getStoryCount()).toBeGreaterThanOrEqual(150);
  });

  it("covers levels 1–5", () => {
    for (const level of [1, 2, 3, 4, 5] as const) {
      expect(getStoriesForLevel(level).length).toBeGreaterThan(0);
    }
  });

  it("stories include metadata", () => {
    const sample = getDecodableStoryCatalog()[0]!;
    expect(sample.requiredFamilies).toBeDefined();
    expect(sample.difficulty).toBeGreaterThan(0);
    expect(sample.estimatedMinutes).toBeGreaterThan(0);
    expect(sample.lines.length).toBeGreaterThan(0);
  });
});
