import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LETTER_INTRODUCTION_GROUPS,
  SATPIN_LETTER_ORDER,
  getUnlockedGraphemes,
  getUnlockedGroupWords,
  inferLetterGroupFromMasteredLetters,
  nextLetterGroupAfterMastery,
  wordDecodableWithGraphemes,
} from "./letter-groups.js";
import { isContentUnlocked } from "./level-gating.js";
import { applyTestOutcome } from "./progression.js";
import type { ChildCurriculumProgress } from "./types.js";

describe("SATPIN letter groups", () => {
  it("Group 1 is SATPIN in pedagogical order", () => {
    assert.deepEqual(LETTER_INTRODUCTION_GROUPS[0]!.graphemes, [
      "s",
      "a",
      "t",
      "p",
      "i",
      "n",
    ]);
    assert.deepEqual(SATPIN_LETTER_ORDER.slice(0, 6), ["s", "a", "t", "p", "i", "n"]);
  });

  it("Group 1 unlocks early blend words", () => {
    const words = getUnlockedGroupWords(1);
    for (const w of ["sat", "sit", "pin", "pan", "tap", "pat"]) {
      assert.ok(words.includes(w), `expected ${w}`);
    }
    assert.ok(!words.includes("cat"));
    assert.ok(!words.includes("dog"));
  });

  it("Group 2 adds MDGOCK words", () => {
    const words = getUnlockedGroupWords(2);
    assert.ok(words.includes("sat"));
    assert.ok(words.includes("cat"));
    assert.ok(words.includes("dog"));
  });

  it("letters outside the unlocked group stay locked", () => {
    const g1 = getUnlockedGraphemes(1);
    assert.equal(g1.has("s"), true);
    assert.equal(g1.has("a"), true);
    assert.equal(g1.has("m"), false);
    assert.equal(g1.has("z"), false);
  });

  it("sat is decodable after Group 1; cat is not", () => {
    const g1 = getUnlockedGraphemes(1);
    assert.equal(wordDecodableWithGraphemes("sat", g1), true);
    assert.equal(wordDecodableWithGraphemes("cat", g1), false);
    assert.equal(wordDecodableWithGraphemes("cat", getUnlockedGraphemes(2)), true);
  });

  it("isContentUnlocked respects letterGroupIndex at L1", () => {
    assert.equal(isContentUnlocked("a", 1, "letter", { letterGroupIndex: 1 }), true);
    assert.equal(isContentUnlocked("m", 1, "letter", { letterGroupIndex: 1 }), false);
    assert.equal(isContentUnlocked("sat", 1, "word", { letterGroupIndex: 1 }), true);
    assert.equal(isContentUnlocked("cat", 1, "word", { letterGroupIndex: 1 }), false);
    assert.equal(isContentUnlocked("cat", 1, "word", { letterGroupIndex: 2 }), true);
  });

  it("advances group when current group letters are mastered", () => {
    assert.equal(nextLetterGroupAfterMastery(1, ["s", "a", "t", "p", "i", "n"]), 2);
    assert.equal(nextLetterGroupAfterMastery(1, ["s", "a", "t"]), 1);
  });

  it("infers letter group from A–Z mastery without reset", () => {
    assert.equal(inferLetterGroupFromMasteredLetters([], 1), 1);
    assert.equal(
      inferLetterGroupFromMasteredLetters(
        ["s", "a", "t", "p", "i", "n", "m", "d", "g", "o", "c", "k"],
        1,
      ),
      2,
    );
    assert.equal(inferLetterGroupFromMasteredLetters(["a", "b", "c"], 2), 8);
  });

  it("Q is taught as qu", () => {
    const qu = LETTER_INTRODUCTION_GROUPS.find((g) => g.id === 7)!;
    assert.deepEqual(qu.graphemes, ["qu"]);
    assert.equal(getUnlockedGraphemes(7).has("q"), true);
    assert.equal(getUnlockedGraphemes(7).has("qu"), true);
  });

  it("L1 does not jump to L2 before letter groups complete", () => {
    const progress: ChildCurriculumProgress = {
      childId: 1,
      userId: "u1",
      currentLevel: 1,
      masteryScore: 90,
      weakPhonemes: [],
      streak: 2,
      lastPlayedAt: null,
      lastTestScore: null,
      lastTestAt: null,
      letterGroupIndex: 2,
    };
    const out = applyTestOutcome(progress, {
      scorePct: 95,
      weakConceptIds: [],
      masteredLetters: ["s", "a", "t", "p", "i", "n", "m", "d", "g", "o", "c", "k"],
    });
    assert.equal(out.currentLevel, 1);
    assert.equal(out.levelChanged, false);
    assert.ok((out.letterGroupIndex ?? 1) >= 2);
  });
});
