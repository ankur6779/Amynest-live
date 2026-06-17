import { describe, expect, it } from "vitest";
import {
  buildLearningPathPrediction,
  buildMasteryContext,
  buildSessionAssetBundle,
  getNextRecommendedWordPack,
  type PrewarmBudget,
} from "./learning-path";
import { defaultMasteryState, recordMasteryEvent } from "./mastery-engine";
import {
  defaultRetentionState,
  introduceSkill,
  recordReviewOutcome,
  daysToMs,
} from "./spaced-repetition";

const BUDGET: PrewarmBudget = { maxPhonemeKeys: 20, maxWords: 10, maxStoryLines: 8 };

describe("learning-path prediction", () => {
  it("is deterministic for the same inputs", () => {
    const a = buildLearningPathPrediction({ childId: 7, curriculumLevel: 2 });
    const b = buildLearningPathPrediction({ childId: 7, curriculumLevel: 2 });
    expect(a.wordPack.words).toEqual(b.wordPack.words);
    expect(a.phonemePack.phonemeKeys).toEqual(b.phonemePack.phonemeKeys);
    expect(a.story.storyId).toEqual(b.story.storyId);
  });

  it("cold-start child gets level-appropriate starter words (medium confidence)", () => {
    const ctx = buildMasteryContext({
      childId: 1,
      curriculumLevel: 2,
      mastery: defaultMasteryState(),
      retention: defaultRetentionState(),
    });
    const pack = getNextRecommendedWordPack(ctx);
    expect(pack.words.length).toBeGreaterThan(0);
    expect(pack.words.every((w) => w.reason === "starter")).toBe(true);
    expect(pack.confidence).toBeGreaterThanOrEqual(60);
    expect(pack.confidence).toBeLessThan(80);
  });

  it("prioritizes overdue then weak when mastery data exists", () => {
    let mastery = defaultMasteryState();
    mastery = recordMasteryEvent(mastery, "word", "cat", "heard");
    let retention = defaultRetentionState();
    const past = Date.now() - daysToMs(40);
    retention = introduceSkill(retention, "word", "hat", past);
    retention = recordReviewOutcome(retention, "word", "hat", true, past);

    const ctx = buildMasteryContext({ childId: 9, curriculumLevel: 2, mastery, retention });
    const pack = getNextRecommendedWordPack(ctx);
    expect(pack.words[0]?.reason).toBe("overdue");
    expect(pack.confidence).toBeGreaterThanOrEqual(80);
  });

  it("asset bundle excludes low-confidence targets and respects budget", () => {
    const prediction = buildLearningPathPrediction({ childId: 7, curriculumLevel: 3 });
    const tight: PrewarmBudget = { maxPhonemeKeys: 3, maxWords: 2, maxStoryLines: 1 };
    const bundle = buildSessionAssetBundle(prediction, tight);
    expect(bundle.wordTexts.length).toBeLessThanOrEqual(2);
    expect(bundle.phonemeKeys.length).toBeLessThanOrEqual(3);
    expect(bundle.storyTexts.length).toBeLessThanOrEqual(1);

    // Story below threshold => excluded entirely.
    const noStory = buildSessionAssetBundle(prediction, BUDGET, {
      word: 0,
      phoneme: 0,
      story: 101,
    });
    expect(noStory.storyTexts).toEqual([]);
    expect(noStory.included.story).toBe(false);
  });
});
