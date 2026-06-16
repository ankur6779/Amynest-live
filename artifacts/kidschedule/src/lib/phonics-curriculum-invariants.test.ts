/**
 * Curriculum invariant tests — regression protection for 7-level gating.
 * Run: pnpm --filter @workspace/kidschedule exec vitest run src/lib/phonics-curriculum-invariants.test.ts
 */
import { describe, expect, it } from "vitest";
import {
  CVC_WORDS,
  BLEND_WORD_IDS,
  CVCC_WORD_IDS,
} from "@workspace/phonics-sounds";
import {
  getCurriculumLevelDef,
  isBlendPathwayAvailable,
  isContentUnlocked,
  isCvccPathwayAvailable,
  isDigraphPathwayAvailable,
  PHONICS_CURRICULUM_LEVELS,
  requiredLevelForSymbol,
  SIGHT_WORDS,
  validateConceptOwnership,
  WORD_FAMILY_IDS,
  getVisibleContentSnapshot,
  serializeVisibleSnapshot,
} from "@workspace/phonics-curriculum";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getUnlockedStoriesV3, STORY_LEVEL_GATES } from "./phonics-v3/content/story-catalog";
import { filterItemsByCurriculumLevel } from "./phonics-curriculum-filter";
import type { DisplayPhonicsItem } from "@/hooks/use-phonics-data";

const SNAPSHOT_DIR = join(
  import.meta.dirname,
  "../../../../lib/phonics-curriculum/src/snapshots",
);

const ALL_TEST_WORDS = [
  ...CVC_WORDS.map((w) => w.word),
  "ship",
  "frog",
  "lamp",
  ...SIGHT_WORDS,
];

function mockItems(symbols: string[]): DisplayPhonicsItem[] {
  return symbols.map((symbol, i) => ({
    id: String(i + 1),
    symbol,
    type: "word" as const,
    contentId: i + 1,
  }));
}

describe("Curriculum invariants — level gating", () => {
  for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
    it(`L${level}: no content above unlocked level`, () => {
      for (const word of ALL_TEST_WORDS) {
        const required = requiredLevelForSymbol(word, "word");
        const unlocked = isContentUnlocked(word, level, "word");
        if (required > level) {
          expect(unlocked).toBe(false);
        }
      }
    });
  }

  it("Word Families unavailable below L3", () => {
    for (const id of WORD_FAMILY_IDS) {
      expect(isContentUnlocked(id, 1)).toBe(false);
      expect(isContentUnlocked(id, 2)).toBe(false);
      expect(isContentUnlocked(`pattern:${id}`, 2)).toBe(false);
      expect(isContentUnlocked(id, 3)).toBe(true);
    }
  });

  it("Digraphs unavailable below L4", () => {
    expect(isContentUnlocked("ship", 3, "word")).toBe(false);
    expect(isContentUnlocked("ship", 4, "word")).toBe(true);
    expect(isDigraphPathwayAvailable(3, 100)).toBe(false);
    expect(isDigraphPathwayAvailable(4, 60)).toBe(true);
  });

  it("Blends unavailable below L5", () => {
    const blend = BLEND_WORD_IDS[0]!;
    expect(isContentUnlocked(blend, 4, "word")).toBe(false);
    expect(isContentUnlocked(blend, 5, "word")).toBe(true);
    expect(isBlendPathwayAvailable(4, 100)).toBe(false);
    expect(isBlendPathwayAvailable(5, 55)).toBe(true);
  });

  it("CVCC unavailable below L6", () => {
    const cvcc = CVCC_WORD_IDS[0]!;
    expect(isContentUnlocked(cvcc, 5, "word")).toBe(false);
    expect(isContentUnlocked(cvcc, 6, "word")).toBe(true);
    expect(isCvccPathwayAvailable(5, 100)).toBe(false);
    expect(isCvccPathwayAvailable(6, 55)).toBe(true);
  });

  it("Sight words unavailable below L7", () => {
    for (const w of SIGHT_WORDS) {
      expect(isContentUnlocked(w, 6, "word")).toBe(false);
      expect(isContentUnlocked(w, 7, "word")).toBe(true);
    }
  });
});

describe("Curriculum invariants — stories", () => {
  it("stories require curriculum level AND mastery", () => {
    const highMasteryL1 = getUnlockedStoriesV3({
      masteredFamilies: [],
      masteryScoreAvg: 100,
      currentLevel: 1,
    });
    expect(highMasteryL1.filter((s) => s.id.startsWith("auth-")).length).toBe(0);

    const lowMasteryL2 = getUnlockedStoriesV3({
      masteredFamilies: [],
      masteryScoreAvg: 5,
      currentLevel: 2,
    });
    expect(lowMasteryL2.filter((s) => s.id.startsWith("auth-")).length).toBe(0);

    const okL2 = getUnlockedStoriesV3({
      masteredFamilies: [],
      masteryScoreAvg: 25,
      currentLevel: 2,
    });
    expect(okL2.some((s) => s.id.startsWith("auth-"))).toBe(true);
  });

  it("every story tier maps to STORY_LEVEL_GATES", () => {
    for (const tier of [1, 2, 3, 4, 5] as const) {
      expect(STORY_LEVEL_GATES[tier].requiredCurriculumLevel).toBeGreaterThan(0);
      expect(STORY_LEVEL_GATES[tier].masteryMin).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Curriculum invariants — ownership", () => {
  it("every concept has single owner and assessment path", () => {
    const result = validateConceptOwnership();
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("L3 does not own full CVC pool", () => {
    const l3 = getCurriculumLevelDef(3);
    const cvcWords = CVC_WORDS.map((w) => w.word);
    const leaked = cvcWords.filter((w) => l3.content.includes(w));
    expect(leaked).toEqual([]);
  });
});

describe("Curriculum invariants — client filter", () => {
  it("filterItemsByCurriculumLevel never returns above-level items", () => {
    const items = mockItems(["cat", "ship", "the", "frog"]);
    for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
      const filtered = filterItemsByCurriculumLevel(items, level);
      for (const item of filtered) {
        expect(isContentUnlocked(item.symbol, level, item.type)).toBe(true);
      }
    }
  });
});

describe("Curriculum snapshots L1–L7", () => {
  for (const level of [1, 2, 3, 4, 5, 6, 7] as const) {
    it(`L${level} visible content matches committed snapshot`, () => {
      const snap = getVisibleContentSnapshot(level);
      const path = join(SNAPSHOT_DIR, `visible-L${level}.json`);
      const expected = readFileSync(path, "utf8");
      expect(serializeVisibleSnapshot(snap)).toBe(expected);
    });
  }
});

describe("Curriculum invariants — level content integrity", () => {
  it("seven levels defined with unique level numbers", () => {
    expect(PHONICS_CURRICULUM_LEVELS).toHaveLength(7);
    const levels = PHONICS_CURRICULUM_LEVELS.map((l) => l.level);
    expect(new Set(levels).size).toBe(7);
  });
});
