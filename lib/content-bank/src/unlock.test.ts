import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ageBandFromChildAge,
  filterUnlockedCatalog,
  pickDailyFeed,
  contentBankActivityId,
} from "./unlock.js";
import type { LifeSkillsLesson } from "./types.js";

describe("content-bank unlock", () => {
  const ctx = {
    childAge: 8,
    learningLevel: 3,
    masteryScore: 60,
    journeyDay: 5,
    completedActivityIds: [] as string[],
    dateIso: "2026-05-29",
    childId: 42,
    isPremium: false,
  };

  it("maps child age to age band", () => {
    assert.equal(ageBandFromChildAge(3), "2-4");
    assert.equal(ageBandFromChildAge(7), "6-8");
    assert.equal(ageBandFromChildAge(11), "10-12");
  });

  it("limits unlocked items progressively", () => {
    const items: LifeSkillsLesson[] = Array.from({ length: 50 }, (_, i) => ({
      id: `ls-test-${i}`,
      ageBand: "6-8",
      skillCategory: "Kindness",
      title: `Lesson ${i}`,
      story: "Story",
      scenario: "Scenario",
      question: "Q?",
      choices: ["A", "B"],
      correctAnswer: "A",
      amyTip: "Tip",
      audioText: "Audio",
    }));
    const unlocked = filterUnlockedCatalog("life-skills", items, ctx);
    assert.ok(unlocked.length > 0);
    assert.ok(unlocked.length < items.length);
  });

  it("daily feed is stable for same seed", () => {
    const items: LifeSkillsLesson[] = Array.from({ length: 30 }, (_, i) => ({
      id: `ls-daily-${i}`,
      ageBand: "6-8",
      skillCategory: "Sharing",
      title: `Daily ${i}`,
      story: "S",
      scenario: "Sc",
      question: "Q",
      choices: ["A"],
      correctAnswer: "A",
      amyTip: "T",
      audioText: "A",
    }));
    const a = pickDailyFeed("life-skills", items, ctx, 5, 0);
    const b = pickDailyFeed("life-skills", items, ctx, 5, 0);
    assert.deepEqual(a.items.map((x) => x.id), b.items.map((x) => x.id));
  });

  it("formats activity ids for learning progress", () => {
    assert.equal(
      contentBankActivityId("smart-study", "ss-2-4-numbers-1"),
      "cb:smart-study:ss-2-4-numbers-1",
    );
  });
});
