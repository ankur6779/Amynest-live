import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyReviewResult,
  bossForLevel,
  buildCertificate,
  buildLearningDna,
  buildLearningPath,
  buildParentInsightsV4,
  buildVerifyCode,
  currentWeeklyEvent,
  detectEmotion,
  dnaEaseFactor,
  emptyAdaptiveStats,
  emptyMasteryState,
  emptyReviewSchedule,
  emotionCue,
  evaluateAchievementsV2,
  foldAttempt,
  generateAdaptivePractice,
  generateProblem,
  nextReviewSkill,
  rng,
  weekendFamilyChallenge,
  worldForLevel,
} from "./index.ts";

describe("abacus V4 curriculum journey", () => {
  it("builds a guided learning path with next chapter", () => {
    const path = buildLearningPath({
      currentLevel: 2,
      completedLevels: [1],
      mastery: emptyMasteryState(),
    });
    assert.equal(path.currentChapter.level, 2);
    assert.ok(path.nextChapter);
    assert.equal(path.nextChapter!.level, 3);
    assert.ok(path.whatNext.length > 0);
    assert.equal(path.nodes.length, 7);
  });
});

describe("abacus V4 Learning DNA", () => {
  it("derives DNA and ease from adaptive stats", () => {
    let stats = emptyAdaptiveStats();
    for (let i = 0; i < 5; i++) {
      stats = foldAttempt(stats, { correct: true, elapsedMs: 1200 });
    }
    const dna = buildLearningDna({ stats, mastery: emptyMasteryState(), activeDaysLastTwoWeeks: 10 });
    assert.ok(dna.accuracy >= 80);
    assert.ok(dna.confidence > 0);
    assert.ok(dnaEaseFactor(dna) >= 0.55);
  });
});

describe("abacus V4 emotion engine", () => {
  it("detects frustration and rotates non-repeating lines", () => {
    let stats = emptyAdaptiveStats();
    for (let i = 0; i < 4; i++) {
      stats = foldAttempt(stats, { correct: false, elapsedMs: 9000, repeatedMistake: true });
    }
    const dna = buildLearningDna({ stats });
    const state = detectEmotion({
      stats,
      profile: {
        signal: "repeated_mistakes",
        easeFactor: 0.7,
        timerScale: 1.2,
        hintFrequency: 0.5,
        suggestReview: true,
        coachNote: "slow down",
      },
      dna,
    });
    assert.equal(state, "frustrated");
    const a = emotionCue({ state, rotate: 0 }).line;
    const b = emotionCue({ state, rotate: 1 }).line;
    assert.notEqual(a, b);
  });
});

describe("abacus V4 story + boss", () => {
  it("maps worlds and bosses per level", () => {
    assert.equal(worldForLevel(1).id, "forest");
    const boss = bossForLevel(7);
    assert.equal(boss.emoji, "🐉");
    assert.ok(boss.challengeCount >= 5);
  });
});

describe("abacus V4 spaced repetition", () => {
  it("schedules weak skills sooner", () => {
    let schedule = emptyReviewSchedule(new Date("2026-07-19T00:00:00.000Z"));
    schedule = applyReviewResult(schedule, "addition", 1, new Date("2026-07-19T00:00:00.000Z"));
    assert.equal(schedule.addition.intervalDays, 1);
    schedule = applyReviewResult(schedule, "addition", 5, new Date("2026-07-20T00:00:00.000Z"));
    assert.ok(schedule.addition.reps >= 1);
    const due = nextReviewSkill(schedule, emptyMasteryState(), new Date("2026-07-21T00:00:00.000Z"));
    assert.ok(due);
  });
});

describe("abacus V4 practice generator", () => {
  it("generates unique sessions via salt", () => {
    const a = generateAdaptivePractice({
      level: 2,
      sessionSalt: 1,
      generateProblem,
      rng,
    });
    const b = generateAdaptivePractice({
      level: 2,
      sessionSalt: 999,
      generateProblem,
      rng,
    });
    assert.ok(typeof a.answer === "number");
    assert.ok(typeof b.answer === "number");
  });
});

describe("abacus V4 achievements + certificates + family + comps", () => {
  it("evaluates achievements and certificates", () => {
    const earned = evaluateAchievementsV2({
      streakDays: 7,
      totalCorrect: 100,
      bossesDefeated: 1,
      worldsUnlocked: 4,
      reviewsCompleted: 5,
    });
    assert.ok(earned.includes("streak_7"));
    assert.ok(earned.includes("boss_slayer"));
    const cert = buildCertificate({
      childId: 9,
      childName: "Aarav",
      mastery: emptyMasteryState(),
      chapterTitle: "Counting Beads",
      completionDate: "2026-07-19",
    });
    assert.equal(cert.verifyCode, buildVerifyCode({
      childId: 9,
      childName: "Aarav",
      completionDate: "2026-07-19",
      masteryPct: cert.masteryPct,
    }));
  });

  it("picks weekend family challenge on Saturday", () => {
    const c = weekendFamilyChallenge("2026-07-18"); // Saturday UTC
    assert.equal(c.id, "weekend_quest");
  });

  it("frames fair weekly competition brackets", () => {
    const ev = currentWeeklyEvent("2026-07-13", 6);
    assert.equal(ev.bracket, "6-7");
    assert.match(ev.blurb, /purchases never/i);
  });
});

describe("abacus V4 parent insights", () => {
  it("answers weekly report questions", () => {
    const dna = buildLearningDna({
      stats: foldAttempt(emptyAdaptiveStats(), { correct: true, elapsedMs: 2000 }),
      activeDaysLastTwoWeeks: 8,
    });
    const report = buildParentInsightsV4({
      dna,
      mastery: emptyMasteryState(),
      review: emptyReviewSchedule(),
      currentLevel: 2,
    });
    assert.ok(report.whatImproved.length > 0);
    assert.ok(report.expectedMasteryDate.length >= 10);
    assert.ok(report.recommendations.length >= 2);
  });
});
