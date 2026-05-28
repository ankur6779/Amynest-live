import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAdaptiveOnboardingPlan,
  shouldOfferSkip,
  buildFirstSessionFlow,
  isFirstSessionSuccess,
  evaluatePremiumPrompt,
  shouldConsiderPremiumPrompt,
  PREMIUM_PROMPT_COOLDOWN_DAYS,
  buildParentConfidenceLine,
  PARENT_CONFIDENCE_FALLBACKS,
  buildLearningEffectiveness,
  buildDevelopmentalPacing,
  pacingHeadline,
  explainRecommendations,
  recommendationsBannerLine,
  auditRecommendations,
  MAX_RECOMMENDATIONS_AT_ONCE,
  buildHumanReviewSnapshot,
  formatReviewDigest,
  buildFamilyJourney,
  buildOptimizationReport,
  verdictLabel,
  buildLearningProfile,
  buildDailyLearningSession,
  type AdaptiveRecommendation,
  type GrowthArcSnapshot,
  type FamilyMilestone,
} from "./index.js";
import { buildLearningMemory } from "./learning-memory.js";

describe("adaptive-onboarding", () => {
  it("picks calm_setup when first-time anxiety is set", () => {
    const plan = buildAdaptiveOnboardingPlan({
      childAge: 5,
      isPremium: false,
      firstTimeAnxiety: true,
    });
    assert.equal(plan.mode, "calm_setup");
    assert.equal(plan.calmVisuals, true);
    assert.ok(plan.reassuranceLine.length > 0);
  });

  it("picks quick_start when time is short", () => {
    const plan = buildAdaptiveOnboardingPlan({
      childAge: 6,
      isPremium: false,
      availableMinutes: 3,
    });
    assert.equal(plan.mode, "quick_start");
    assert.equal(plan.steps.length, 2);
  });

  it("respects performance tier for calm visuals", () => {
    const plan = buildAdaptiveOnboardingPlan({
      childAge: 6,
      isPremium: false,
      performanceTier: "low",
    });
    assert.equal(plan.calmVisuals, true);
  });

  it("shouldOfferSkip is true for quick_start", () => {
    const plan = buildAdaptiveOnboardingPlan({
      childAge: 6,
      isPremium: false,
      availableMinutes: 3,
    });
    assert.equal(shouldOfferSkip(plan, "welcome"), true);
  });
});

describe("first-session-flow", () => {
  it("trims to 3 items and orders by difficulty", () => {
    const profile = buildLearningProfile(1, {}, 5);
    const memory = buildLearningMemory(profile, []);
    const daily = buildDailyLearningSession(
      profile,
      memory,
      {
        numbersMax: 5,
        alphabetRange: { start: "A", end: "C" },
        unlockedShapes: [],
        unlockedAnimals: 0,
        phonicsLevel: 1,
        speechLevel: 1,
        storyLevel: 1,
        puzzleDifficulty: "easy",
        worksheetDifficulty: "easy",
        todaysUnlocks: [],
        nextSessionUnlocks: [],
        revisionContent: [],
        numbersStage: "1-5",
        alphabetsStage: "A-C",
        shapesStage: "basic",
        colorsStage: "basic",
        learningLevel: 1,
        isRevisionDay: false,
      },
      { childId: 1, dateIso: "2026-01-01" },
    );
    const flow = buildFirstSessionFlow({ daily, childName: "Aarav" });
    assert.ok(flow.items.length <= 3);
    assert.ok(flow.encouragement.intro.includes("Aarav"));
    assert.equal(flow.rewardIntensity, "card");
  });

  it("isFirstSessionSuccess fires after 2+ steps", () => {
    assert.equal(isFirstSessionSuccess({ totalSteps: 3, completedSteps: 2 }), true);
    assert.equal(isFirstSessionSuccess({ totalSteps: 3, completedSteps: 1 }), false);
    assert.equal(isFirstSessionSuccess({ totalSteps: 0, completedSteps: 0 }), false);
  });
});

describe("premium-conversion", () => {
  it("returns null when already premium", () => {
    const profile = buildLearningProfile(1, { streakDays: 10 }, 6);
    const memory = buildLearningMemory(profile, []);
    const p = evaluatePremiumPrompt({
      profile,
      memory,
      isPremium: true,
    });
    assert.equal(p, null);
  });

  it("respects cooldown", () => {
    const today = "2026-06-01";
    const lastPrompt = "2026-05-30"; // 2 days ago, < cooldown
    assert.equal(
      shouldConsiderPremiumPrompt({
        isPremium: false,
        lastPromptIso: lastPrompt,
        todayIso: today,
      }),
      false,
    );
  });

  it("suggests long_streak_recognition for big streaks", () => {
    const profile = buildLearningProfile(1, { streakDays: 35, masteryScore: 70 }, 6);
    const memory = buildLearningMemory(profile, []);
    const memWithMastery = { ...memory, masteredSkills: ["a", "b", "c", "d", "e"] };
    const p = evaluatePremiumPrompt({
      profile,
      memory: memWithMastery,
      isPremium: false,
      lastPromptIso: null,
      seenPromptIds: [],
      childName: "Aarav",
    });
    assert.ok(p, "expected a prompt");
    assert.equal(p!.id, "long_streak_recognition");
    assert.ok(p!.message.includes("Aarav"));
    assert.ok(!/upgrade now/i.test(p!.message));
  });

  it("never reshows the same prompt", () => {
    const profile = buildLearningProfile(1, { streakDays: 8 }, 6);
    const memory = buildLearningMemory(profile, []);
    const p = evaluatePremiumPrompt({
      profile,
      memory,
      isPremium: false,
      seenPromptIds: ["first_week_growth"],
      childName: "Riya",
    });
    if (p) assert.notEqual(p.id, "first_week_growth");
  });

  it("uses cooldown constant", () => {
    assert.equal(PREMIUM_PROMPT_COOLDOWN_DAYS, 7);
  });
});

describe("parent-confidence", () => {
  it("returns null when there's no activity at all", () => {
    const profile = buildLearningProfile(1, {}, 6);
    const memory = buildLearningMemory(profile, []);
    const line = buildParentConfidenceLine({ profile, memory });
    assert.equal(line, null);
  });

  it("celebrates a 7+ day streak warmly", () => {
    const profile = buildLearningProfile(
      1,
      { streakDays: 7, completedActivities: Array.from({ length: 20 }, (_, i) => `a${i}`) },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const line = buildParentConfidenceLine({ profile, memory });
    assert.ok(line);
    assert.equal(line!.tone, "consistency_praise");
    assert.ok(line!.text.length > 0);
  });

  it("uses short copy for notification surface", () => {
    const profile = buildLearningProfile(
      1,
      { streakDays: 7, completedActivities: ["a"] },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const long = buildParentConfidenceLine({ profile, memory, surface: "dashboard" });
    const short = buildParentConfidenceLine({ profile, memory, surface: "notification" });
    assert.ok(short!.text.length <= long!.text.length);
  });

  it("fallbacks contain no guilt language", () => {
    for (const t of PARENT_CONFIDENCE_FALLBACKS) {
      assert.ok(!/missed|failed|behind/i.test(t), `unsafe fallback: ${t}`);
    }
  });
});

describe("learning-effectiveness", () => {
  it("returns no_signal for empty snapshots", () => {
    const r = buildLearningEffectiveness([]);
    assert.equal(r.label, "no_signal");
    assert.equal(r.retentionRate, 0);
  });

  it("detects growth across snapshots", () => {
    const r = buildLearningEffectiveness([
      {
        dateIso: "2026-01-01",
        entries: [
          {
            skillId: "math_counting",
            category: "math",
            mastery: 30,
            confidence: 30,
            attempts: 2,
            progressionStage: "exploring",
            relatedSkills: ["math_number_recognition"],
          },
        ],
      },
      {
        dateIso: "2026-02-15",
        entries: [
          {
            skillId: "math_counting",
            category: "math",
            mastery: 60,
            confidence: 60,
            attempts: 6,
            progressionStage: "practicing",
            relatedSkills: ["math_number_recognition"],
          },
        ],
      },
    ]);
    assert.ok(r.confidenceTrend > 0);
    assert.ok(r.label === "growing" || r.label === "steady");
  });
});

describe("developmental-pacing", () => {
  it("slows down on frustration signals", () => {
    const profile = buildLearningProfile(1, { masteryScore: 30 }, 6);
    const memory = buildLearningMemory(profile, []);
    const p = buildDevelopmentalPacing({
      profile,
      memory,
      signals: { abandonedSessions: 3, retryClicks: 6 },
    });
    assert.equal(p.action, "slow_down");
    assert.equal(p.recommendedSessionSize, 3);
    assert.equal(p.difficultyHint, "lighter");
  });

  it("pushes when ready", () => {
    const profile = buildLearningProfile(
      1,
      { masteryScore: 70, streakDays: 7, completedActivities: Array.from({ length: 30 }, (_, i) => `a${i}`) },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const p = buildDevelopmentalPacing({
      profile,
      memory,
      signals: { recentAccuracy: 0.85 },
    });
    assert.equal(p.action, "push");
    assert.equal(p.difficultyHint, "stretch");
  });

  it("headline maps each action", () => {
    const actions: ReturnType<typeof buildDevelopmentalPacing>["action"][] = [
      "push",
      "reinforce",
      "simplify",
      "slow_down",
      "steady",
    ];
    for (const action of actions) {
      const headline = pacingHeadline({
        action,
        reason: "",
        parentLine: "",
        recommendedSessionSize: 5,
        difficultyHint: "balanced",
      });
      assert.ok(headline.toLowerCase().startsWith("today:"));
    }
  });
});

describe("recommendation-explanations", () => {
  const baseRecs: AdaptiveRecommendation[] = [
    {
      id: "rec_weak_phonics_blending",
      title: "Phonics practice",
      reason: "(opaque)",
      emoji: "🔤",
      href: "/phonics",
      priority: "high",
      skillId: "phonics_blending",
    },
    {
      id: "rec_revision",
      title: "Gentle review",
      reason: "(opaque)",
      emoji: "🔄",
      href: "/study",
      priority: "high",
    },
  ];

  it("rewrites opaque reasons into warm sentences", () => {
    const profile = buildLearningProfile(1, {}, 6);
    const memory = buildLearningMemory(profile, []);
    const out = explainRecommendations(baseRecs, { memory, childName: "Aarav" });
    assert.equal(out.length, 2);
    assert.notEqual(out[0]!.warmReason, "(opaque)");
    assert.ok(/Aarav/.test(out[0]!.warmReason));
    assert.equal(out[0]!.category, "reinforcement");
    assert.equal(out[1]!.category, "revision");
  });

  it("banner line adapts to memory state", () => {
    const profile = buildLearningProfile(1, {}, 6);
    const memory = buildLearningMemory(profile, []);
    const memWithStruggle = { ...memory, strugglingSkills: ["a", "b"] };
    const line = recommendationsBannerLine({ memory: memWithStruggle });
    assert.ok(line.length > 0);
    assert.ok(/reinforces/i.test(line));
  });
});

describe("recommendation-audits", () => {
  it("flags overload", () => {
    const recs: AdaptiveRecommendation[] = Array.from({ length: 6 }, (_, i) => ({
      id: `r${i}`,
      title: `r${i}`,
      reason: "",
      emoji: "🎯",
      href: `/x${i}`,
      priority: "medium",
    }));
    const r = auditRecommendations({ recommendations: recs });
    assert.ok(r.issues.some((i) => i.kind === "overload"));
    assert.ok(r.safeOrder.length <= MAX_RECOMMENDATIONS_AT_ONCE);
  });

  it("flags emotional inconsistency between push and slow", () => {
    const recs: AdaptiveRecommendation[] = [
      { id: "rec_challenge", title: "stretch", reason: "", emoji: "🚀", href: "/study", priority: "medium" },
      { id: "rec_revision", title: "review", reason: "", emoji: "🔄", href: "/study2", priority: "high" },
    ];
    const r = auditRecommendations({ recommendations: recs });
    assert.ok(r.issues.some((i) => i.kind === "emotional_inconsistency"));
  });

  it("drops repeated skills from safe order", () => {
    const recs: AdaptiveRecommendation[] = [
      { id: "rec_weak_phonics_letter_sounds", title: "phonics", reason: "", emoji: "🔤", href: "/phonics", priority: "high", skillId: "phonics_letter_sounds" },
      { id: "rec_weak_math_counting", title: "math", reason: "", emoji: "🔢", href: "/study", priority: "high", skillId: "math_counting" },
    ];
    const r = auditRecommendations({
      recommendations: recs,
      recentlyRecommendedSkillIds: ["phonics_letter_sounds"],
    });
    assert.ok(r.issues.some((i) => i.kind === "repeated_skill"));
    assert.ok(!r.safeOrder.find((x) => x.skillId === "phonics_letter_sounds"));
  });
});

describe("human-review", () => {
  it("flags unsafe samples", () => {
    const snap = buildHumanReviewSnapshot([
      { surface: "ai_tutor", id: "1", text: "Your child may have ADHD." },
      { surface: "emotional_copy", id: "2", text: "Beautiful, calm rhythm today!" },
    ]);
    assert.equal(snap.samples.length, 2);
    assert.equal(snap.flaggedCount, 1);
    assert.equal(snap.samples[0]!.needsReview, true);
    assert.equal(snap.samples[1]!.needsReview, false);
  });

  it("formats a digest", () => {
    const snap = buildHumanReviewSnapshot([
      { surface: "ai_tutor", id: "1", text: "Don't lose your streak — act now!" },
    ]);
    const digest = formatReviewDigest(snap);
    assert.ok(digest.includes("Human review"));
    assert.ok(digest.includes("ai_tutor"));
  });
});

describe("family-journey", () => {
  it("returns null when there's nothing to summarize", () => {
    assert.equal(
      buildFamilyJourney({
        snapshots: [],
        milestones: [],
        periodLabel: "2026",
      }),
      null,
    );
  });

  it("builds a summary with multiple highlights", () => {
    const snapshots: GrowthArcSnapshot[] = Array.from({ length: 8 }, (_, i) => ({
      month: `2026-${String(i + 1).padStart(2, "0")}`,
      masteryScore: 20 + i * 5,
      totalXP: 100 + i * 50,
      streakDays: 2 + i,
      activitiesCompleted: i === 5 ? 0 : 10 + i,
      masteredSkills: i,
      strugglingSkills: 1,
    }));
    const milestones: FamilyMilestone[] = [
      {
        id: "first_streak_7",
        emoji: "🌟",
        title: "A full week",
        message: "...",
        shareLabel: "Share",
        shareableSummary: "...",
      },
    ];
    const summary = buildFamilyJourney({
      snapshots,
      milestones,
      childName: "Aarav",
      periodLabel: "2026",
    });
    assert.ok(summary);
    assert.ok(summary!.headline.includes("Aarav"));
    assert.ok(summary!.highlights.length > 0);
    assert.ok(summary!.memories.length === 1);
  });
});

describe("optimization-pipeline", () => {
  it("ships when signals are healthy", () => {
    const r = buildOptimizationReport({
      d7Retention: 0.6,
      onboardingCompletion: 0.7,
      premiumConversion: 0.4,
      sessionCompletion: 0.85,
      comebackSuccess: 0.6,
      burnoutSignals: 0,
    });
    assert.equal(r.verdict, "ship");
    assert.ok(r.score >= 70);
  });

  it("holds when safety degrades", () => {
    const r = buildOptimizationReport({
      sessionCompletion: 0.3,
      burnoutSignals: 80,
      onboardingCompletion: 0.3,
    });
    assert.equal(r.verdict, "hold");
    assert.ok(r.notes.length > 0);
  });

  it("verdict label is informative", () => {
    const r = buildOptimizationReport({ sessionCompletion: 0.5 });
    const label = verdictLabel(r);
    assert.ok(label.length > 0);
  });
});
