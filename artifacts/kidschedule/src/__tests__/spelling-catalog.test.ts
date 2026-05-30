import { describe, expect, it } from "vitest";
import {
  getSpellingManifest,
  getBucketWordCount,
  selectSessionWords,
  emptySessionHistory,
  filterByPlayerLevel,
} from "@workspace/spelling-catalog";

describe("spelling catalog", () => {
  it("has 200+ words per age/difficulty bucket", () => {
    const manifest = getSpellingManifest();
    for (const count of Object.values(manifest.meta.bucketCounts)) {
      expect(count).toBeGreaterThanOrEqual(200);
    }
  });

  it("picks 5 fresh session words without overlap", () => {
    const manifest = getSpellingManifest();
    const first = selectSessionWords(manifest, {
      ageGroup: "4-6",
      difficulty: "easy",
      playerLevel: 50,
      count: 5,
      history: emptySessionHistory(),
    });
    expect(first.words).toHaveLength(5);
    const ids = first.words.map((w) => w.id);
    expect(new Set(ids).size).toBe(5);

    const second = selectSessionWords(manifest, {
      ageGroup: "4-6",
      difficulty: "easy",
      playerLevel: 50,
      count: 5,
      history: first.history,
      excludeIds: first.words.map((w) => w.id),
    });
    expect(second.words).toHaveLength(5);
    for (const w of second.words) {
      expect(first.words.some((x) => x.id === w.id)).toBe(false);
    }
  });

  it("unlocks harder words as player level increases", () => {
    const manifest = getSpellingManifest();
    const bucket = manifest.buckets["8-10+:hard"] ?? [];
    expect(filterByPlayerLevel(bucket, 5).length).toBeLessThan(
      filterByPlayerLevel(bucket, 50).length,
    );
    expect(getBucketWordCount("2-4", "easy")).toBeGreaterThanOrEqual(200);
  });
});
