import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateFlag,
  isFlagEnabled,
  bucketForChild,
  FLAG_KEYS,
  assignVariant,
  EXPERIMENT_KEYS,
  optimizeBehavior,
  scoreRecommendationOutcomes,
  qualityLabel,
  applyAiGuardrails,
  filterGuardedLines,
  detectFamilyMilestone,
  scorePlatformHealth,
  computeCohortRetention,
  computeWeeklyCohorts,
  computeComebackSuccessRate,
  buildLifecyclePlan,
  compactProfile,
  simulateLearningJourney,
  presetThirtyDaySteady,
  buildLearningProfile,
} from "./index.js";
import { buildLearningMemory } from "./learning-memory.js";

describe("feature-flags", () => {
  it("kill switch overrides everything", () => {
    const res = evaluateFlag(
      FLAG_KEYS.rewardPacingV2,
      { defaultEnabled: true, killSwitch: true, rules: [{ kind: "on" }] },
      { childId: 1, isPremium: true },
    );
    assert.equal(res.enabled, false);
    assert.equal(res.reason, "kill_switch");
  });

  it("percentage rollout is deterministic", () => {
    const config = {
      defaultEnabled: false,
      rules: [{ kind: "percentage" as const, percentage: 50 }],
    };
    const a = isFlagEnabled(FLAG_KEYS.aiToneWarmer, config, { childId: 7, isPremium: false });
    const b = isFlagEnabled(FLAG_KEYS.aiToneWarmer, config, { childId: 7, isPremium: false });
    assert.equal(a, b);
  });

  it("allowlist matches the child id", () => {
    const res = evaluateFlag(
      "f",
      {
        defaultEnabled: false,
        rules: [{ kind: "allowlist", childIds: [42] }],
      },
      { childId: 42, isPremium: false },
    );
    assert.equal(res.enabled, true);
    assert.equal(res.reason, "allowlist_match");
  });

  it("bucket is in 0..99", () => {
    const b = bucketForChild("x", 1234);
    assert.ok(b >= 0 && b < 100);
  });
});

describe("behavior-experiments", () => {
  it("paused experiments return the default variant", () => {
    const a = assignVariant(
      {
        key: EXPERIMENT_KEYS.rewardPacing,
        default: "control",
        variants: [
          { key: "control", weight: 50 },
          { key: "treatment", weight: 50 },
        ],
        paused: true,
      },
      55,
    );
    assert.equal(a.variant, "control");
  });

  it("holdout users get the default variant", () => {
    // Holdout 100% — everyone is in holdout.
    const a = assignVariant(
      {
        key: EXPERIMENT_KEYS.comebackStrategy,
        default: "control",
        variants: [{ key: "treatment", weight: 100 }],
        holdoutPercent: 100,
      },
      9,
    );
    assert.equal(a.isHoldout, true);
    assert.equal(a.variant, "control");
  });

  it("assignment is deterministic", () => {
    const def = {
      key: EXPERIMENT_KEYS.sessionSize,
      default: "control" as const,
      variants: [
        { key: "control" as const, weight: 50 },
        { key: "treatment" as const, weight: 50 },
      ],
    };
    const a = assignVariant(def, 33);
    const b = assignVariant(def, 33);
    assert.equal(a.variant, b.variant);
  });
});

describe("behavior-optimizer", () => {
  it("flags burnout when many activities + struggling skills", () => {
    const profile = buildLearningProfile(1, {}, 6);
    const memory = buildLearningMemory(profile, []);
    const memWithStruggle = { ...memory, strugglingSkills: ["a", "b"] };
    const opt = optimizeBehavior({
      profile,
      memory: memWithStruggle,
      signals: { activitiesLast24h: 40, rewardsShownToday: 5 },
    });
    assert.equal(opt.burnoutRisk, true);
    assert.equal(opt.celebration, "calm");
    assert.equal(opt.recommendationLimit, 1);
  });

  it("warms in a comeback learner", () => {
    const profile = buildLearningProfile(1, {}, 6);
    const memory = buildLearningMemory(profile, []);
    const opt = optimizeBehavior({
      profile,
      memory,
      signals: { daysInactive: 7 },
    });
    assert.equal(opt.reason, "comeback_warm_in");
    assert.equal(opt.celebration, "playful");
  });
});

describe("recommendation-quality", () => {
  it("computes acceptance + completion rates", () => {
    const score = scoreRecommendationOutcomes([
      { recommendationId: "a", kind: "shown", at: "2026-01-01T00:00:00Z" },
      { recommendationId: "a", kind: "accepted", at: "2026-01-01T00:00:01Z" },
      { recommendationId: "a", kind: "completed", at: "2026-01-01T00:00:02Z" },
      { recommendationId: "b", kind: "shown", at: "2026-01-01T00:00:03Z" },
      { recommendationId: "b", kind: "ignored", at: "2026-01-01T00:00:04Z" },
    ]);
    assert.equal(score.shown, 2);
    assert.equal(score.accepted, 1);
    assert.equal(score.completed, 1);
    assert.equal(score.acceptanceRate, 0.5);
    assert.ok(score.effectiveness >= 0);
    assert.equal(qualityLabel(score), score.effectiveness >= 0.2 ? "useful" : "neutral");
  });

  it("detects fatigue after repeated ignores", () => {
    const events = Array.from({ length: 8 }, (_, i) => ({
      recommendationId: `r${i}`,
      kind: i < 4 ? ("shown" as const) : ("ignored" as const),
      at: "2026-01-01T00:00:00Z",
    }));
    const score = scoreRecommendationOutcomes(events);
    assert.equal(score.fatigueRisk, true);
  });
});

describe("ai-guardrails", () => {
  it("strips diagnostic language", () => {
    const res = applyAiGuardrails("Your child may have ADHD and is falling behind.");
    assert.equal(res.safe, false);
    assert.ok(res.violations.length >= 2);
    assert.ok(!/ADHD/i.test(res.text));
    assert.ok(!/falling behind/i.test(res.text));
  });

  it("leaves safe text alone", () => {
    const res = applyAiGuardrails("Wonderful work today! Try one more story when you're ready.");
    assert.equal(res.safe, true);
    assert.equal(res.text, "Wonderful work today! Try one more story when you're ready.");
  });

  it("filters a list of lines", () => {
    const res = filterGuardedLines([
      "Don't lose your streak — act now!",
      "We saved a cozy adventure for tomorrow.",
    ]);
    assert.equal(res.lines.length, 2);
    assert.ok(res.allViolations.length > 0);
  });
});

describe("family-milestones", () => {
  it("returns null when no milestones apply", () => {
    const profile = buildLearningProfile(1, {}, 6);
    const memory = buildLearningMemory(profile, []);
    const m = detectFamilyMilestone({
      profile,
      memory,
      seenMilestoneIds: [],
      childName: "Aarav",
    });
    assert.equal(m, null);
  });

  it("returns first_session when activities exist", () => {
    const profile = buildLearningProfile(
      1,
      { completedActivities: ["a"], streakDays: 1 },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const m = detectFamilyMilestone({
      profile,
      memory,
      seenMilestoneIds: [],
      childName: "Aarav",
    });
    assert.equal(m?.id, "first_session");
  });

  it("prefers stronger milestones over weaker ones", () => {
    const profile = buildLearningProfile(
      1,
      { completedActivities: Array.from({ length: 50 }, (_, i) => `a${i}`), streakDays: 8 },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const m = detectFamilyMilestone({
      profile,
      memory,
      seenMilestoneIds: [],
      childName: "Aarav",
    });
    // streakDays >= 7 should win over first_session.
    assert.ok(m?.id === "first_streak_7" || m?.id === "first_full_week");
  });
});

describe("platform-health", () => {
  it("rates a healthy platform highly", () => {
    const h = scorePlatformHealth({
      syncSuccessRate: 0.99,
      syncLatencyMs: 200,
      rewardAccuracy: 1,
      queueDepth: 4,
      renderFps: 60,
      d7Retention: 0.5,
      burnoutSignals: 0,
    });
    assert.ok(h.score >= 85);
    assert.equal(h.label, "excellent");
  });

  it("flags watch/degraded when sync degrades", () => {
    const h = scorePlatformHealth({
      syncSuccessRate: 0.7,
      syncLatencyMs: 2000,
      rewardAccuracy: 0.8,
      queueDepth: 2000,
      renderFps: 20,
      d7Retention: 0.2,
      burnoutSignals: 30,
    });
    assert.ok(h.score < 70, `expected < 70, got ${h.score}`);
    assert.ok(h.notes.length > 0);
    assert.notEqual(h.label, "excellent");
  });
});

describe("retention-cohorts", () => {
  it("buckets members and computes retention", () => {
    const cohorts = computeWeeklyCohorts([
      {
        childId: 1,
        signupDateIso: "2026-01-05",
        activeDates: ["2026-01-06", "2026-01-07", "2026-01-12"],
      },
      {
        childId: 2,
        signupDateIso: "2026-01-05",
        activeDates: [],
      },
    ]);
    assert.equal(cohorts.length, 1);
    assert.equal(cohorts[0]!.size, 2);
    assert.equal(cohorts[0]!.d1, 0.5);
    assert.equal(cohorts[0]!.d7, 0.5);
  });

  it("computes comeback success rate", () => {
    const r = computeComebackSuccessRate([
      { childId: 1, inactiveSinceIso: "2026-01-01", returnedOnIso: "2026-01-08" },
      { childId: 2, inactiveSinceIso: "2026-01-01", returnedOnIso: null },
    ]);
    assert.equal(r, 0.5);
  });

  it("returns empty retention for empty cohort", () => {
    const r = computeCohortRetention("empty", []);
    assert.equal(r.size, 0);
    assert.equal(r.d7, 0);
  });
});

describe("data-lifecycle", () => {
  it("builds a plan with appropriate cutoffs", () => {
    const plan = buildLifecyclePlan("2026-06-01");
    const raw = plan.find((p) => p.collection === "rawActivities");
    assert.ok(raw);
    assert.equal(raw!.cutoffIso, "2026-03-03");
    assert.equal(raw!.action, "aggregate");
  });

  it("compacts a profile to a small shape", () => {
    const profile = buildLearningProfile(
      1,
      { completedActivities: ["a", "b"], totalXP: 100 },
      6,
    );
    const compact = compactProfile(profile);
    assert.equal(compact.childId, 1);
    assert.equal(compact.totalActivities, 2);
    assert.equal(compact.totalXP, 100);
  });
});

describe("learning-simulator", () => {
  it("runs a 30-day simulation without errors", () => {
    const opts = presetThirtyDaySteady(1);
    const result = simulateLearningJourney(opts);
    assert.equal(result.days.length, 30);
    assert.ok(result.totals.attempted > 0);
    assert.ok(result.finalProfile.totalXP >= 0);
  });

  it("respects anti-spam when spam attempts are issued", () => {
    const result = simulateLearningJourney({
      childId: 1,
      age: 6,
      startDateIso: "2026-01-01",
      days: [
        { section: "math", activities: 10, accuracy: 1, spamAttempt: true },
      ],
    });
    assert.ok(result.totals.ignored > 0 || result.totals.diminished > 0);
  });
});
