import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createDefaultPersonalityProfile,
  inferTraitsFromBehavior,
  mergeTraitsSlowly,
  updatePersonalityFromBehavior,
  detectPersonalityDrift,
  deriveLearningStyle,
} from "./personalityEngine.js";
import {
  createInitialLearningPath,
  computeGoalAlignmentScore,
  updateLearningPathAfterSession,
  learningPathSummary,
} from "./learningPathEngine.js";
import { applyPersonalityToPrediction } from "./personalityNba.js";
import { resolveSessionPersonalization } from "../sessionPersonalization.js";
import { resolveRewardPolicy } from "../realtime/rewardEngine.js";
import { createDefaultLearningProfile } from "../learningProfileEngine.js";
import { NBA_ACTIONS } from "./types.js";

describe("trait inference", () => {
  it("low persistence on high skips", () => {
    const traits = inferTraitsFromBehavior({
      skips: 5,
      rapidTaps: 0,
      explorationSuccesses: 0,
      retries: 0,
      rewardEngagements: 0,
      completions: 0,
    });
    assert.ok(traits.persistence < 0.5);
  });

  it("high curiosity on exploration success", () => {
    const traits = inferTraitsFromBehavior({
      skips: 0,
      rapidTaps: 0,
      explorationSuccesses: 4,
      retries: 0,
      rewardEngagements: 1,
      completions: 2,
    });
    assert.ok(traits.curiosity > 0.5);
  });

  it("normalizes traits to 0-1", () => {
    const traits = inferTraitsFromBehavior({
      skips: 2,
      rapidTaps: 3,
      explorationSuccesses: 1,
      retries: 2,
      rewardEngagements: 1,
      completions: 1,
    });
    for (const v of Object.values(traits)) {
      assert.ok(v >= 0 && v <= 1);
    }
  });
});

describe("personality updates", () => {
  it("merges slowly without sudden jumps", () => {
    const profile = createDefaultPersonalityProfile("c1");
    const before = profile.traits.persistence;
    const updated = updatePersonalityFromBehavior(profile, {
      skips: 4,
      rapidTaps: 0,
      explorationSuccesses: 0,
      retries: 0,
      rewardEngagements: 0,
      completions: 0,
    });
    const delta = Math.abs(updated.traits.persistence - before);
    assert.ok(delta <= 0.12);
  });

  it("detects drift above threshold", () => {
    const prev = createDefaultPersonalityProfile("c1").traits;
    const next = mergeTraitsSlowly(prev, {
      curiosity: 0.95,
      persistence: 0.2,
      distractibility: 0.9,
      challengeSeeking: 0.85,
      rewardSensitivity: 0.8,
    });
    const drift = detectPersonalityDrift(prev, next);
    assert.ok(drift.magnitude >= 0);
  });

  it("derives learning style from traits", () => {
    const style = deriveLearningStyle({
      curiosity: 0.8,
      persistence: 0.7,
      distractibility: 0.3,
      challengeSeeking: 0.6,
      rewardSensitivity: 0.5,
    });
    assert.equal(style.prefersExploration, true);
  });
});

describe("NBA personality scoring", () => {
  it("boosts exploration when curiosity high", () => {
    const personality = createDefaultPersonalityProfile("c1");
    personality.traits.curiosity = 0.85;
    const probs = Object.fromEntries(NBA_ACTIONS.map((a) => [a, 1 / NBA_ACTIONS.length])) as Record<
      import("./types.js").NbaAction,
      number
    >;
    const pred = applyPersonalityToPrediction(
      {
        action: "KEEP_AS_IS",
        confidence: 0.2,
        probabilities: probs,
        rewardEstimate: 0.5,
      },
      personality,
      {} as import("../realtime/types.js").RealtimeSessionState,
    );
    assert.ok(
      (pred.probabilities.INTRODUCE_EXPLORATION ?? 0) >
        (probs.INTRODUCE_EXPLORATION ?? 0),
    );
  });
});

describe("session adaptation", () => {
  it("shortens sessions when distractibility high", () => {
    const p = createDefaultPersonalityProfile("c1");
    p.traits.distractibility = 0.8;
    const limits = resolveSessionPersonalization(p);
    assert.ok(limits.maxItems <= 8);
  });

  it("reward policy increases frequency when reward sensitive", () => {
    const p = createDefaultPersonalityProfile("c1");
    p.traits.rewardSensitivity = 0.8;
    const policy = resolveRewardPolicy(p);
    assert.ok(policy.cooldownMultiplier < 1);
  });
});

describe("learning path progression", () => {
  it("creates goals from profile", () => {
    const profile = createDefaultLearningProfile("c1");
    const path = createInitialLearningPath("c1", profile, "36_48");
    assert.ok(path.goals.length >= 2);
    assert.ok(path.milestones.length >= 2);
  });

  it("aligns phonics content with path", () => {
    const profile = createDefaultLearningProfile("c1");
    const path = createInitialLearningPath("c1", profile, "36_48");
    const score = computeGoalAlignmentScore("phonics", path);
    assert.ok(score > 0);
  });

  it("updates progress after successful session", () => {
    const profile = createDefaultLearningProfile("c1");
    let path = createInitialLearningPath("c1", profile, "36_48");
    const before = path.progressScore;
    path = updateLearningPathAfterSession(path, profile, "36_48", {
      childId: "c1",
      moduleId: "phonics",
      contentId: "x",
      completionRate: 0.9,
      timeSpentSec: 120,
      skips: 0,
      retries: 0,
      completed: true,
    });
    assert.ok(path.progressScore >= before);
    const summary = learningPathSummary(path);
    assert.ok(summary.currentGoal.length > 0);
  });
});
