/**
 * Phase 6 — Production readiness validation (post P0 fixes).
 * Mirrors Phase 5 audit sections: journey, duplicates, stories, assessments.
 */
import { describe, expect, it } from "vitest";
import {
  getCurriculumLevelDef,
  isContentUnlocked,
  PHONICS_CURRICULUM_LEVELS,
  WORD_FAMILY_IDS,
} from "@workspace/phonics-curriculum";
import { CVC_WORDS } from "@workspace/phonics-sounds";
import { filterItemsByCurriculumLevel } from "@/lib/phonics-curriculum-filter";
import type { DisplayPhonicsItem } from "@/hooks/use-phonics-data";
import { getUnlockedStoriesV3 } from "./content/story-catalog";
import { buildAdaptiveDailyMission } from "./adaptive-selector";
import { defaultMasteryState, recordMasteryEvent } from "./mastery-engine";

const CVC_POOL = CVC_WORDS.map((w) => w.word);

function mockItems(symbols: string[]): DisplayPhonicsItem[] {
  return symbols.map((symbol, i) => ({
    id: String(i + 1),
    symbol,
    type: "word" as const,
    contentId: i + 1,
  }));
}

function visibleWords(level: number): string[] {
  return CVC_POOL.filter((w) => isContentUnlocked(w, level as 1, "word"));
}

describe("Phase 6 — Child Journey Simulation", () => {
  it("Child A (L1): letters only, no CVC or stories", () => {
    expect(isContentUnlocked("a", 1, "letter")).toBe(true);
    expect(isContentUnlocked("cat", 1, "word")).toBe(false);
    expect(isContentUnlocked("ship", 1, "word")).toBe(false);

    const stories = getUnlockedStoriesV3({
      masteredFamilies: [],
      masteryScoreAvg: 100,
      currentLevel: 1,
    });
    expect(stories.filter((s) => s.id.startsWith("auth-")).length).toBe(0);
    expect(stories.filter((s) => s.id.startsWith("dig-")).length).toBe(0);
  });

  it("Child B (L2): CVC visible, digraphs and L3+ families hidden", () => {
    expect(visibleWords(2).length).toBeGreaterThan(0);
    expect(isContentUnlocked("cat", 2, "word")).toBe(true);
    expect(isContentUnlocked("ship", 2, "word")).toBe(false);
    expect(isContentUnlocked("the", 2, "word")).toBe(false);

    const filtered = filterItemsByCurriculumLevel(
      mockItems(["cat", "ship", "the"]),
      2,
    );
    expect(filtered.map((i) => i.symbol)).toEqual(["cat"]);
  });

  it("Child C (L4): digraphs visible, blends still hidden", () => {
    expect(isContentUnlocked("ship", 4, "word")).toBe(true);
    expect(isContentUnlocked("frog", 4, "word")).toBe(false);
    expect(isContentUnlocked("lamp", 4, "word")).toBe(false);
  });

  it("Child D (L7): sight words and fluency content visible", () => {
    expect(isContentUnlocked("the", 7, "word")).toBe(true);
    expect(isContentUnlocked("and", 7, "word")).toBe(true);
    const l7 = getCurriculumLevelDef(7);
    expect(l7.content.some((c) => c.includes("The cat sat"))).toBe(true);
  });
});

describe("Phase 6 — Duplicate / Level Ownership", () => {
  it("L3 owns family ids and patterns, not full CVC pool", () => {
    const l3 = PHONICS_CURRICULUM_LEVELS.find((l) => l.level === 3)!;
    for (const id of WORD_FAMILY_IDS) {
      expect(l3.content).toContain(id);
      expect(l3.content).toContain(`pattern:${id}`);
    }
    const cvcInL3 = CVC_POOL.filter((w) => l3.content.includes(w));
    expect(cvcInL3.length).toBe(0);
  });

  it("L2 owns CVC pool exclusively among word levels", () => {
    const l2 = getCurriculumLevelDef(2);
    expect(l2.content.length).toBe(CVC_POOL.length);
  });
});

describe("Phase 6 — Story Validation", () => {
  it("auth stories require L2+ and mastery threshold", () => {
    const lowMastery = getUnlockedStoriesV3({
      masteredFamilies: [],
      masteryScoreAvg: 5,
      currentLevel: 2,
    });
    expect(lowMastery.filter((s) => s.id.startsWith("auth-")).length).toBe(0);

    const ok = getUnlockedStoriesV3({
      masteredFamilies: [],
      masteryScoreAvg: 25,
      currentLevel: 2,
    });
    expect(ok.some((s) => s.id.startsWith("auth-"))).toBe(true);
  });

  it("V2 migrated stories respect curriculum gate at L1", () => {
    const atL1 = getUnlockedStoriesV3({
      masteredFamilies: [],
      masteryScoreAvg: 100,
      currentLevel: 1,
    });
    const v2Ids = atL1.filter((s) => s.id.startsWith("story-"));
    expect(v2Ids.length).toBe(0);
  });
});

describe("Phase 6 — Mission Selector Gating", () => {
  it("L1 mission excludes CVC words from adaptive picks", () => {
    const items = mockItems(["cat", "hat", "a"]);
    let mastery = defaultMasteryState();
    mastery = recordMasteryEvent(mastery, "word", "cat", "heard");
    const mission = buildAdaptiveDailyMission({
      childId: 1,
      items,
      progress: { practiced: { "1": 1 }, mastered: {} },
      mastery,
      streakDay: 1,
      curriculumLevel: 1,
    });
    const words = mission.adaptivePicks.map((p) => p.word);
    expect(words.every((w) => isContentUnlocked(w, 1, "word"))).toBe(true);
    expect(words.includes("cat")).toBe(false);
  });
});
