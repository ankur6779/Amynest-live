import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyMasteryAttempt,
  buildDailyMission,
  buildLivingTutorCoachFragment,
  deriveAdaptiveProfile,
  emptyAdaptiveStats,
  emptyCollectionState,
  emptyMasteryState,
  evaluateCollectionUnlocks,
  featuredMicroGame,
  foldAttempt,
  generateProblem,
  livingCoachLine,
  markMissionStep,
  missionProgress,
  rng,
  scaleOperandRange,
  skillForLevelMode,
  tierFromScore,
} from "./index.ts";

describe("abacus V3 adaptive", () => {
  it("detects fast learner from accuracy + speed", () => {
    let stats = emptyAdaptiveStats();
    for (let i = 0; i < 4; i++) {
      stats = foldAttempt(stats, { correct: true, elapsedMs: 1500 });
    }
    const profile = deriveAdaptiveProfile(stats);
    assert.equal(profile.signal, "fast_learner");
    assert.ok(profile.easeFactor > 1);
  });

  it("softens ranges when ease < 1", () => {
    const [lo, hi] = scaleOperandRange([1, 20], 0.5);
    assert.equal(lo, 1);
    assert.ok(hi < 20);
  });

  it("generateProblem accepts easeFactor without breaking", () => {
    const easy = generateProblem(2, rng(1), { easeFactor: 0.6 });
    const hard = generateProblem(2, rng(1), { easeFactor: 1.4 });
    assert.ok(typeof easy.answer === "number");
    assert.ok(typeof hard.answer === "number");
  });
});

describe("abacus V3 mastery", () => {
  it("climbs tiers with correct streaks", () => {
    let state = emptyMasteryState();
    for (let i = 0; i < 30; i++) {
      state = applyMasteryAttempt(state, "addition", { correct: true, elapsedMs: 2000 });
    }
    assert.ok(state.addition.score > 50);
    assert.notEqual(tierFromScore(state.addition.score), "beginner");
    assert.equal(skillForLevelMode(2, "practice"), "addition");
  });
});

describe("abacus V3 missions + collections", () => {
  it("builds a 5-step daily adventure", () => {
    const m = buildDailyMission({ dateKey: "2026-07-19", childId: 7, level: 2 });
    assert.equal(m.steps.length, 5);
    assert.equal(m.estimatedMinutes, 5);
    const mid = markMissionStep(m, "warmup");
    assert.equal(missionProgress(mid).completed, 1);
  });

  it("unlocks learning-only collection items", () => {
    const { newlyUnlocked } = evaluateCollectionUnlocks(emptyCollectionState(), {
      totalCorrect: 12,
      streakDays: 3,
      perfectChallenge: true,
      warmupDone: true,
      missionComplete: true,
      tutorAsks: 3,
      levelUnlocked: true,
      learnComplete: true,
      playedLightning: true,
      playedMagicBeads: true,
      mentalTierAtLeastDeveloping: true,
      additionMaster: true,
      anyMaster: true,
      mentalLegend: false,
      missionsCompleted: 5,
    });
    assert.ok(newlyUnlocked.includes("pet_fox"));
    assert.ok(newlyUnlocked.includes("gem_amber"));
  });

  it("features a deterministic micro-game", () => {
    const a = featuredMicroGame("2026-07-19", 1);
    const b = featuredMicroGame("2026-07-19", 1);
    assert.equal(a.id, b.id);
  });
});

describe("abacus V3 living tutor", () => {
  it("speaks like a teacher on repeat mistakes", () => {
    let stats = emptyAdaptiveStats();
    stats = foldAttempt(stats, { correct: false, elapsedMs: 4000, repeatedMistake: true });
    stats = foldAttempt(stats, { correct: false, elapsedMs: 4000, repeatedMistake: true });
    const line = livingCoachLine({
      stats,
      profile: deriveAdaptiveProfile(stats),
      language: "en",
    });
    assert.match(line, /twice|same|slow/i);
    const frag = buildLivingTutorCoachFragment({
      stats,
      profile: deriveAdaptiveProfile(stats),
    });
    assert.match(frag, /living classroom teacher/i);
  });
});
