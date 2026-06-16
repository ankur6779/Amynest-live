/**
 * Story validation CI — requiredLevel, requiredConcepts, symbol gating.
 */
import { describe, expect, it } from "vitest";
import {
  getDecodableStoryCatalog,
  getUnlockedStoriesV3,
  STORY_LEVEL_GATES,
  type DecodableStoryMeta,
} from "./content/story-catalog";
import { requiredLevelForSymbol } from "@workspace/phonics-curriculum";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function getStoryRequiredLevel(story: DecodableStoryMeta): number {
  if (story.id.startsWith("dig-")) return 4;
  if (story.id.startsWith("blend-")) return 5;
  if (story.id.startsWith("cvcc-")) return 6;
  return STORY_LEVEL_GATES[story.level].requiredCurriculumLevel;
}

function getStoryRequiredConcepts(story: DecodableStoryMeta): string[] {
  const fromLines = story.lines.flatMap((l) => l.highlightWords);
  return [...new Set([...story.requiredFamilies, ...story.requiredSounds, ...fromLines])];
}

function extractStoryWords(story: DecodableStoryMeta): string[] {
  const words = new Set<string>();
  for (const line of story.lines) {
    for (const token of line.text.toLowerCase().match(/[a-z]+/g) ?? []) {
      if (token.length >= 2) words.add(token);
    }
    for (const hw of line.highlightWords) {
      words.add(hw.toLowerCase());
    }
  }
  return [...words];
}

describe("Story validation CI", () => {
  const catalog = getDecodableStoryCatalog();

  it("every story declares requiredLevel via tier or prefix", () => {
    for (const story of catalog) {
      const level = getStoryRequiredLevel(story);
      expect(level).toBeGreaterThanOrEqual(2);
      expect(level).toBeLessThanOrEqual(7);
    }
  });

  it("every story has prerequisite mapping (families, sounds, or highlights)", () => {
    const missing = catalog.filter((s) => getStoryRequiredConcepts(s).length === 0);
    expect(missing.map((s) => s.id)).toEqual([]);
  });

  it("story symbols above tier are tracked (no new violations vs baseline)", () => {
    const baselinePath = join(
      import.meta.dirname,
      "story-symbol-baseline.json",
    );
    const baseline = new Set(
      JSON.parse(readFileSync(baselinePath, "utf8")) as string[],
    );

    const violations: string[] = [];
    for (const story of catalog) {
      const maxLevel = getStoryRequiredLevel(story);
      for (const word of extractStoryWords(story)) {
        const owner = requiredLevelForSymbol(word, "word");
        if (owner > maxLevel && word.length > 2) {
          violations.push(`${story.id}: "${word}" owner L${owner} > tier L${maxLevel}`);
        }
      }
    }

    const newViolations = violations.filter((v) => !baseline.has(v));
    expect(newViolations).toEqual([]);
  });

  it("no duplicate story ids", () => {
    const ids = catalog.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("unlocked catalog respects curriculum level at L1", () => {
    const atL1 = getUnlockedStoriesV3({
      masteredFamilies: [],
      masteryScoreAvg: 100,
      currentLevel: 1,
    });
    expect(atL1.length).toBe(0);
  });
});
