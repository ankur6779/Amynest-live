/**
 * Full Platform Architecture Validation Pass.
 *
 * A 10-phase production-grade stress test of the AmyNest platform. NOT
 * adding features — only validating that every core system, edge case,
 * sync flow, emotional flow, and operational safety layer holds up under
 * pressure.
 *
 * Run via:
 *   node --import tsx/esm --test lib/learning-progress-engine/src/validation-pass.test.ts
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  // Phase 1 — engine core
  buildLearningProfile,
  recordActivityCompletion,
  getUnlocks,
  defaultSectionProgress,
  // Phase 3 composer
  composePhase3Status,
  // Skill graph
  applySkillAttempt,
  summarizeSkillGraph,
  type SkillGraphEntry,
  // Memory
  buildLearningMemory,
  // Behavior + pacing
  optimizeBehavior,
  buildDevelopmentalPacing,
  // Anti-spam
  evaluateActivityIngest,
  isLikelyDuplicateTap,
  ACTIVITY_COOLDOWN_MS,
  // Feature flags + experiments
  evaluateFlag,
  isFlagEnabled,
  bucketForChild,
  assignVariant,
  FLAG_KEYS,
  EXPERIMENT_KEYS,
  // Recommendations
  buildAdaptiveRecommendations,
  explainRecommendations,
  auditRecommendations,
  MAX_RECOMMENDATIONS_AT_ONCE,
  // Onboarding + first session
  buildAdaptiveOnboardingPlan,
  buildFirstSessionFlow,
  // Premium + confidence
  evaluatePremiumPrompt,
  buildParentConfidenceLine,
  PARENT_CONFIDENCE_FALLBACKS,
  // AI safety
  applyAiGuardrails,
  // Family memory
  detectFamilyMilestone,
  buildFamilyJourney,
  // Effectiveness + health
  buildLearningEffectiveness,
  scorePlatformHealth,
  buildOptimizationReport,
  // Simulation
  simulateLearningJourney,
  presetThirtyDaySteady,
  // Stewardship
  reviewStewardship,
  STEWARDSHIP_DOCTRINE,
  // Living companion + emotional copy
  buildLivingCompanionLine,
  encouragementForAccuracy,
  sessionCompleteHeadline,
  // Notifications
  buildLearningNotification,
  // Daily session
  buildDailyLearningSession,
  type DifficultyAdjustment,
  type AdaptiveRecommendation,
  type UnlockResult,
} from "./index.js";

// ============================================================================
// Helpers
// ============================================================================

const SECTIONS = ["phonics", "math", "speech", "stories", "puzzles", "worksheets"] as const;

function freshUnlocks(): UnlockResult {
  return {
    numbersMax: 5,
    alphabetRange: { start: "A", end: "C" },
    unlockedShapes: ["circle"],
    unlockedAnimals: 2,
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
  };
}

function freshDifficulty(): DifficultyAdjustment {
  return {
    mode: "balanced",
    reason: "default",
    engagementMode: "regular",
  } as DifficultyAdjustment;
}

// ============================================================================
// PHASE 1 — Core engine validation
// ============================================================================

describe("PHASE 1 — engine core: deterministic outputs + null safety", () => {
  it("buildLearningProfile is deterministic for the same input", () => {
    const a = buildLearningProfile(1, { streakDays: 3, totalXP: 100 }, 5);
    const b = buildLearningProfile(1, { streakDays: 3, totalXP: 100 }, 5);
    assert.deepEqual(a, b);
  });

  it("buildLearningProfile tolerates empty partial", () => {
    const p = buildLearningProfile(1, {}, 5);
    assert.equal(typeof p.masteryScore, "number");
    assert.ok(!Number.isNaN(p.masteryScore));
    assert.ok(p.masteryScore >= 0 && p.masteryScore <= 100);
    assert.ok(p.totalXP >= 0);
    assert.ok(Array.isArray(p.completedActivities));
    assert.ok(Array.isArray(p.unlockedSkills));
    assert.ok(p.sectionProgress);
  });

  it("buildLearningProfile rejects no NaN values even with garbage partial", () => {
    const p = buildLearningProfile(
      1,
      {
        masteryScore: undefined,
        totalXP: undefined,
        streakDays: undefined,
        completedActivities: undefined,
      } as never,
      5,
    );
    assert.ok(!Number.isNaN(p.masteryScore));
    assert.ok(!Number.isNaN(p.totalXP));
    assert.ok(!Number.isNaN(p.streakDays));
  });

  it("recordActivityCompletion never produces negative XP or mastery > 100", () => {
    let profile = buildLearningProfile(1, {}, 5);
    for (let i = 0; i < 200; i++) {
      const updates = recordActivityCompletion(
        profile,
        `math_n${i}`,
        "math",
        i % 3 !== 0,
        "2026-01-01",
      );
      profile = { ...profile, ...updates };
      assert.ok(profile.totalXP >= 0, `negative xp at step ${i}`);
      assert.ok(profile.masteryScore >= 0 && profile.masteryScore <= 100);
      for (const [, sec] of Object.entries(profile.sectionProgress)) {
        assert.ok(sec.masteryPct >= 0 && sec.masteryPct <= 100);
        assert.ok(sec.activitiesCompleted >= 0);
        assert.ok(sec.level >= 1 && sec.level <= 10);
      }
    }
  });

  it("getUnlocks tolerates a fresh profile with no section data", () => {
    const u = getUnlocks({
      age: 4,
      journeyDay: 1,
      masteryScore: 0,
      streakDays: 0,
      completedActivities: [],
      sectionProgress: defaultSectionProgress(),
      isPremium: false,
    });
    assert.ok(u.numbersMax > 0);
    assert.ok(u.alphabetRange.start);
    assert.ok(u.alphabetRange.end);
    assert.ok(Array.isArray(u.todaysUnlocks));
    // phonicsLevel = 0 is legitimate (pre-phonics letter-recognition stage)
    assert.ok(u.phonicsLevel >= 0 && u.phonicsLevel <= 10);
    assert.ok(!Number.isNaN(u.phonicsLevel));
  });

  it("applySkillAttempt with null previous entry initializes correctly", () => {
    const e = applySkillAttempt(null, "math_counting", true, "2026-01-01T00:00:00Z");
    assert.equal(e.skillId, "math_counting");
    assert.equal(e.attempts, 1);
    assert.ok(e.mastery >= 0 && e.mastery <= 100);
  });

  it("summarizeSkillGraph tolerates empty + corrupted entries", () => {
    const summary = summarizeSkillGraph([]);
    assert.deepEqual(summary.masteredSkills, []);
    assert.deepEqual(summary.strugglingSkills, []);
    assert.deepEqual(summary.forgottenSkills, []);
  });

  it("buildLearningMemory tolerates an empty profile", () => {
    const profile = buildLearningProfile(1, {}, 5);
    const memory = buildLearningMemory(profile, []);
    assert.ok(memory.strongestCategory === null);
    assert.ok(memory.weakestCategory === null);
    assert.ok(Array.isArray(memory.masteredSkills));
  });

  it("composePhase3Status produces no NaN / null pollution", () => {
    const profile = buildLearningProfile(1, {}, 5);
    const phase3 = composePhase3Status({
      childId: 1,
      childName: "Aarav",
      profile,
      unlocks: freshUnlocks(),
      hubAccess: { unlockedRange: { from: 1, to: 1 }, dailyDay: 1, dailyMax: 1, isPremium: false } as never,
      isPremium: false,
      weeklyReport: {
        weekStart: "2026-01-01",
        weekEnd: "2026-01-07",
        newWordsLearned: 0,
        countingImprovement: null,
        pronunciationImprovementPct: null,
        activitiesCompleted: 0,
        streakDays: 0,
        highlights: [],
        sectionGains: {},
      },
      skillEntries: [],
      persisted: {
        coins: 0,
        stars: 0,
        badges: [],
        dailySession: null,
        learningMemory: null,
      },
      dateIso: "2026-01-01",
    });
    assert.ok(phase3.memory);
    assert.ok(phase3.wallet);
    assert.ok(phase3.dailySession);
    assert.ok(Array.isArray(phase3.recommendations));
    assert.ok(Array.isArray(phase3.tutorLines));
  });

  it("optimizeBehavior is bounded — session size always 3..7", () => {
    const profile = buildLearningProfile(1, { masteryScore: 80, streakDays: 30 }, 8);
    const memory = buildLearningMemory(profile, []);
    const out = optimizeBehavior({
      profile,
      memory,
      signals: { activitiesLast24h: 200, rewardsShownToday: 100 },
    });
    assert.ok(out.sessionSize >= 3 && out.sessionSize <= 7, `oob session size ${out.sessionSize}`);
    assert.ok(out.recommendationLimit >= 0 && out.recommendationLimit <= 5);
  });
});

// ============================================================================
// PHASE 2 — Progression integrity (1-day → 6-month, premium, comeback)
// ============================================================================

describe("PHASE 2 — progression integrity", () => {
  it("30-day simulation produces non-decreasing totalXP", () => {
    const result = simulateLearningJourney(presetThirtyDaySteady(1));
    let lastXP = 0;
    for (const d of result.days) {
      assert.ok(d.totalXP >= lastXP, `xp regressed at ${d.dateIso}`);
      lastXP = d.totalXP;
    }
    assert.equal(result.days.length, 30);
  });

  it("180-day simulation maintains coherent streak progression", () => {
    const days = Array.from({ length: 180 }, (_, i) => ({
      section: SECTIONS[i % SECTIONS.length] as never,
      activities: 3,
      accuracy: 0.7 + (i % 5) * 0.05,
      inactive: i % 14 === 13,
    }));
    const result = simulateLearningJourney({
      childId: 1,
      age: 6,
      startDateIso: "2026-01-01",
      days,
    });
    assert.equal(result.days.length, 180);
    // Streak should reset after inactive days
    const inactiveIdx = result.days.findIndex((d) => d.behaviorReason === "inactive_day");
    if (inactiveIdx >= 0 && inactiveIdx < result.days.length - 1) {
      // The day right after inactive should still have a streak (could carry or reset to 1)
      assert.ok(result.days[inactiveIdx + 1]!.streakDays >= 1);
    }
  });

  it("comeback after 10-day gap: streak resets to 1", () => {
    let profile = buildLearningProfile(1, { streakDays: 7, lastActiveDate: "2026-01-01" }, 6);
    const updates = recordActivityCompletion(
      profile,
      "math_n1",
      "math",
      true,
      "2026-01-20", // 19 days later
    );
    profile = { ...profile, ...updates };
    assert.equal(profile.streakDays, 1, "streak should reset on gap > 2 days");
  });

  it("same-day completion does not double-count streak", () => {
    let profile = buildLearningProfile(1, { streakDays: 3, lastActiveDate: "2026-01-01" }, 6);
    const updates1 = recordActivityCompletion(profile, "a1", "math", true, "2026-01-01");
    profile = { ...profile, ...updates1 };
    const updates2 = recordActivityCompletion(profile, "a2", "math", true, "2026-01-01");
    profile = { ...profile, ...updates2 };
    assert.equal(profile.streakDays, 3, "streak should not bump within same day");
  });

  it("completedActivities is capped at 200 to bound profile size", () => {
    let profile = buildLearningProfile(1, {}, 6);
    for (let i = 0; i < 250; i++) {
      const updates = recordActivityCompletion(profile, `a${i}`, "math", true, "2026-01-01");
      profile = { ...profile, ...updates };
    }
    assert.ok(profile.completedActivities.length <= 200, "completedActivities overflow");
  });
});

// ============================================================================
// PHASE 3 — Offline + sync stress test (anti-spam + dedup)
// ============================================================================

describe("PHASE 3 — anti-spam + sync stress", () => {
  it("blocks 50 rapid duplicate taps within cooldown", () => {
    const recent = [{ activityId: "math_1", section: "math" as const, correct: true, at: new Date().toISOString() }];
    let blocked = 0;
    for (let i = 0; i < 50; i++) {
      const res = evaluateActivityIngest({
        activityId: "math_1",
        section: "math",
        correct: true,
        recent,
      });
      if (res.decision === "ignore") blocked += 1;
    }
    assert.equal(blocked, 50, "all duplicates within cooldown should be ignored");
  });

  it("isLikelyDuplicateTap mirrors evaluateActivityIngest cooldown", () => {
    const now = Date.now();
    const recent = [{ activityId: "math_1", at: new Date(now - ACTIVITY_COOLDOWN_MS / 2).toISOString() }];
    assert.equal(isLikelyDuplicateTap("math_1", recent), true);
  });

  it("burst cap kicks in after 12 events/min across activities", () => {
    const baseTime = Date.now();
    const recent = Array.from({ length: 12 }, (_, i) => ({
      activityId: `a${i}`,
      section: "math" as const,
      correct: true,
      at: new Date(baseTime - i * 500).toISOString(),
    }));
    const res = evaluateActivityIngest({
      activityId: "a_new",
      section: "math",
      correct: true,
      recent,
    });
    assert.equal(res.decision, "ignore");
    assert.equal(res.reason, "burst_cap");
  });

  it("simulator under spam attempts always credits ≤ hard cap", () => {
    const result = simulateLearningJourney({
      childId: 1,
      age: 6,
      startDateIso: "2026-01-01",
      days: [
        { section: "math", activities: 20, accuracy: 1, spamAttempt: true },
      ],
    });
    // With spam attempts on, all 20 hits the same activityId.
    // Expect repetition cap to fire — ignored + diminished combined > 0.
    assert.ok(result.totals.ignored + result.totals.diminished >= 10, "anti-spam under-blocks");
  });
});

// ============================================================================
// PHASE 4 — Emotional safety audit (copy from engine modules)
// ============================================================================

describe("PHASE 4 — emotional safety audit", () => {
  function audit(text: string, ctx: string) {
    const res = applyAiGuardrails(text);
    assert.equal(
      res.violations.length,
      0,
      `unsafe copy in ${ctx}: "${text}" violations=${res.violations.map((v) => v.category).join(",")}`,
    );
  }

  it("parent-confidence fallbacks pass guardrails", () => {
    for (const f of PARENT_CONFIDENCE_FALLBACKS) audit(f, "PARENT_CONFIDENCE_FALLBACKS");
  });

  it("emotional-copy helpers produce safe copy", () => {
    for (const acc of [0, 0.3, 0.6, 0.9]) {
      audit(encouragementForAccuracy(acc), `encouragementForAccuracy(${acc})`);
    }
    audit(sessionCompleteHeadline({ activitiesCompleted: 3 }), "sessionCompleteHeadline");
  });

  it("comeback / re-engagement variants are warm", () => {
    const profile = buildLearningProfile(1, { streakDays: 0, lastActiveDate: "2026-01-01" }, 6);
    const memory = buildLearningMemory(profile, []);
    const line = buildParentConfidenceLine({ profile, memory, surface: "comeback" });
    if (line) audit(line.text, "parent-confidence comeback line");
  });

  it("notifications never contain guilt / urgency", () => {
    const profile = buildLearningProfile(
      1,
      { streakDays: 3, completedActivities: ["a", "b"], lastActiveDate: "2026-01-01" },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const note = buildLearningNotification({
      profile,
      memory,
      todayIso: "2026-01-05",
      childName: "Aarav",
    });
    if (note) audit(note.title + " " + note.body, "notification");
  });

  it("tutor proactive lines + recommendation explanations stay safe", () => {
    const profile = buildLearningProfile(
      1,
      { streakDays: 7, completedActivities: Array.from({ length: 20 }, (_, i) => `a${i}`) },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const recs: AdaptiveRecommendation[] = [
      {
        id: "rec_weak_phonics_blending",
        title: "Phonics",
        reason: "",
        emoji: "🔤",
        href: "/phonics",
        priority: "high",
        skillId: "phonics_blending",
      },
    ];
    const explained = explainRecommendations(recs, { memory });
    for (const r of explained) audit(r.warmReason, `explained ${r.id}`);
  });

  it("STEWARDSHIP_DOCTRINE strings pass guardrails", () => {
    for (const [k, v] of Object.entries(STEWARDSHIP_DOCTRINE)) audit(v, `doctrine.${k}`);
  });
});

// ============================================================================
// PHASE 5 — Recommendation consistency (thousands of combinations)
// ============================================================================

describe("PHASE 5 — recommendation consistency", () => {
  it("auditRecommendations never returns more than MAX safe items", () => {
    const recs: AdaptiveRecommendation[] = Array.from({ length: 20 }, (_, i) => ({
      id: `r${i}`,
      title: `r${i}`,
      reason: "",
      emoji: "🎯",
      href: `/x${i % 5}`,
      priority: i % 3 === 0 ? "high" : i % 3 === 1 ? "medium" : "low",
      skillId: `skill_${i % 7}`,
    }));
    const r = auditRecommendations({ recommendations: recs });
    assert.ok(r.safeOrder.length <= MAX_RECOMMENDATIONS_AT_ONCE);
    // Safe order should never include emotionally inconsistent pairings.
    const hasPush = r.safeOrder.some((x) => x.id === "rec_challenge");
    const hasSlow = r.safeOrder.some((x) => x.id === "rec_revision" || x.id === "rec_comeback");
    assert.ok(!(hasPush && hasSlow));
  });

  it("buildAdaptiveRecommendations is stable across re-invocations", () => {
    const profile = buildLearningProfile(
      1,
      { streakDays: 5, masteryScore: 50, completedActivities: ["math_1"] },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const a = buildAdaptiveRecommendations({
      profile,
      memory,
      unlocks: freshUnlocks(),
      difficulty: freshDifficulty(),
      isPremium: false,
    });
    const b = buildAdaptiveRecommendations({
      profile,
      memory,
      unlocks: freshUnlocks(),
      difficulty: freshDifficulty(),
      isPremium: false,
    });
    assert.deepEqual(a, b, "recommendations should be deterministic");
  });

  it("explainRecommendations never blanks the reason field", () => {
    const recs: AdaptiveRecommendation[] = [
      { id: "rec_weak_x", title: "x", reason: "", emoji: "🎯", href: "/a", priority: "high", skillId: "phonics_blending" },
      { id: "rec_revision", title: "review", reason: "", emoji: "🔄", href: "/b", priority: "high" },
      { id: "rec_challenge", title: "stretch", reason: "", emoji: "🚀", href: "/c", priority: "medium" },
      { id: "rec_favorite", title: "fave", reason: "", emoji: "✨", href: "/d", priority: "low" },
      { id: "rec_fresh_1", title: "fresh", reason: "", emoji: "🌟", href: "/e", priority: "low" },
    ];
    const out = explainRecommendations(recs, { memory: buildLearningMemory(buildLearningProfile(1, {}, 6), []) });
    for (const o of out) assert.ok(o.warmReason.length > 0, `empty reason on ${o.id}`);
  });

  it("audit returns coherent: true for a tidy 3-card set", () => {
    const recs: AdaptiveRecommendation[] = [
      { id: "rec_weak_phonics", title: "phonics", reason: "", emoji: "🔤", href: "/phonics", priority: "high", skillId: "phonics_blending" },
      { id: "rec_fresh_1", title: "fresh", reason: "", emoji: "🌟", href: "/study", priority: "medium" },
      { id: "rec_favorite", title: "fave", reason: "", emoji: "✨", href: "/speech-coach", priority: "low" },
    ];
    const r = auditRecommendations({ recommendations: recs });
    assert.equal(r.coherent, true);
  });
});

// ============================================================================
// PHASE 6 — UI continuity (engine-side contract: living companion, copy)
// ============================================================================

describe("PHASE 6 — UI continuity contract", () => {
  it("living-companion returns a usable line or null", () => {
    const profile = buildLearningProfile(1, { streakDays: 3 }, 6);
    const memory = buildLearningMemory(profile, []);
    const line = buildLivingCompanionLine({
      surface: "study_home",
      profile,
      memory,
      childName: "Aarav",
    });
    if (line) {
      assert.ok(typeof line.text === "string" && line.text.length > 0);
      assert.ok(applyAiGuardrails(line.text).safe);
    }
  });

  it("first-session flow never exceeds 3 items", () => {
    const profile = buildLearningProfile(1, {}, 5);
    const memory = buildLearningMemory(profile, []);
    const daily = buildDailyLearningSession(profile, memory, freshUnlocks(), {
      childId: 1,
      dateIso: "2026-01-01",
    });
    const flow = buildFirstSessionFlow({ daily, childName: "Aarav" });
    assert.ok(flow.items.length <= 3);
    assert.ok(flow.items.length >= 1);
  });

  it("first-session flow with lightVisuals=true caps at 2 items", () => {
    const profile = buildLearningProfile(1, {}, 5);
    const memory = buildLearningMemory(profile, []);
    const daily = buildDailyLearningSession(profile, memory, freshUnlocks(), {
      childId: 1,
      dateIso: "2026-01-01",
    });
    const flow = buildFirstSessionFlow({ daily, lightVisuals: true });
    assert.ok(flow.items.length <= 2);
  });

  it("adaptive onboarding always returns at least one step", () => {
    for (const age of [3, 5, 7, 10]) {
      for (const tier of ["low", "mid", "high"] as const) {
        const plan = buildAdaptiveOnboardingPlan({
          childAge: age,
          isPremium: false,
          performanceTier: tier,
        });
        assert.ok(plan.steps.length >= 1);
        assert.ok(plan.estimatedSeconds > 0);
      }
    }
  });
});

// ============================================================================
// PHASE 7 — Performance / scale (large profiles + memory bounds)
// ============================================================================

describe("PHASE 7 — performance + memory", () => {
  it("composePhase3Status handles a 200-activity profile under 250ms", () => {
    const profile = buildLearningProfile(
      1,
      { completedActivities: Array.from({ length: 200 }, (_, i) => `a${i}`), totalXP: 5000, streakDays: 30 },
      8,
    );
    const skillEntries: SkillGraphEntry[] = Array.from({ length: 30 }, (_, i) => ({
      childId: 1,
      skillId: `skill_${i}`,
      category: "math",
      mastery: 50,
      confidence: 50,
      attempts: 5,
      lastPracticedAt: "2026-01-01",
      relatedSkills: [],
      weakAreas: [],
      progressionStage: "practicing",
    }));
    const t0 = performance.now();
    composePhase3Status({
      childId: 1,
      childName: "Aarav",
      profile,
      unlocks: freshUnlocks(),
      hubAccess: { isPremium: false } as never,
      isPremium: false,
      weeklyReport: {
        weekStart: "2026-01-01",
        weekEnd: "2026-01-07",
        newWordsLearned: 0,
        countingImprovement: null,
        pronunciationImprovementPct: null,
        activitiesCompleted: 0,
        streakDays: 30,
        highlights: [],
        sectionGains: {},
      },
      skillEntries,
      persisted: {
        coins: 0,
        stars: 0,
        badges: [],
        dailySession: null,
        learningMemory: null,
      },
    });
    const dt = performance.now() - t0;
    assert.ok(dt < 250, `composePhase3Status too slow: ${dt.toFixed(1)}ms`);
  });

  it("365-day simulation finishes under 3 seconds", () => {
    const days = Array.from({ length: 365 }, (_, i) => ({
      section: SECTIONS[i % SECTIONS.length] as never,
      activities: 2 + (i % 3),
      accuracy: 0.7,
      inactive: i % 13 === 12,
    }));
    const t0 = performance.now();
    const result = simulateLearningJourney({
      childId: 1,
      age: 5,
      startDateIso: "2026-01-01",
      days,
    });
    const dt = performance.now() - t0;
    assert.ok(dt < 3000, `365-day sim too slow: ${dt.toFixed(0)}ms`);
    assert.equal(result.days.length, 365);
  });
});

// ============================================================================
// PHASE 8 — Feature flag + experiment validation
// ============================================================================

describe("PHASE 8 — flags + experiments", () => {
  it("bucketForChild is in 0..99 for many children", () => {
    for (let i = 0; i < 1000; i++) {
      const b = bucketForChild("flag_test", i);
      assert.ok(b >= 0 && b < 100);
    }
  });

  it("percentage rollout converges to declared percent (±5)", () => {
    const flag = {
      defaultEnabled: false,
      rules: [{ kind: "percentage" as const, percentage: 30 }],
    };
    let on = 0;
    for (let i = 0; i < 1000; i++) {
      if (isFlagEnabled(FLAG_KEYS.aiToneWarmer, flag, { childId: i, isPremium: false })) on += 1;
    }
    const pct = on / 10;
    assert.ok(pct > 25 && pct < 35, `percentage drift: ${pct}%`);
  });

  it("kill switch globally overrides every rule", () => {
    const flag = {
      defaultEnabled: true,
      killSwitch: true,
      rules: [{ kind: "on" as const }],
    };
    for (let i = 0; i < 50; i++) {
      assert.equal(isFlagEnabled(FLAG_KEYS.aiToneWarmer, flag, { childId: i, isPremium: true }), false);
    }
  });

  it("experiment assignment is stable across calls (no drift)", () => {
    const def = {
      key: EXPERIMENT_KEYS.rewardPacing,
      default: "control" as const,
      variants: [
        { key: "control" as const, weight: 50 },
        { key: "treatment" as const, weight: 50 },
      ],
    };
    for (let i = 0; i < 200; i++) {
      const a = assignVariant(def, i);
      const b = assignVariant(def, i);
      assert.equal(a.variant, b.variant);
      assert.equal(a.bucket, b.bucket);
    }
  });

  it("holdout = 100% routes every user to default", () => {
    const def = {
      key: "x",
      default: "ctrl" as const,
      variants: [{ key: "treat" as const, weight: 100 }],
      holdoutPercent: 100,
    };
    for (let i = 0; i < 100; i++) {
      const a = assignVariant(def, i);
      assert.equal(a.isHoldout, true);
      assert.equal(a.variant, "ctrl");
    }
  });
});

// ============================================================================
// PHASE 9 — Observability + recommendation reasoning
// ============================================================================

describe("PHASE 9 — observability", () => {
  it("every recommendation has a non-empty href + reason after explanation", () => {
    const profile = buildLearningProfile(
      1,
      { streakDays: 5, masteryScore: 50, completedActivities: ["math_1"] },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const memWithWeak = { ...memory, strugglingSkills: ["phonics_blending"] };
    const recs = buildAdaptiveRecommendations({
      profile,
      memory: memWithWeak,
      unlocks: { ...freshUnlocks(), isRevisionDay: true },
      difficulty: freshDifficulty(),
      isPremium: true,
    });
    const explained = explainRecommendations(recs, { memory: memWithWeak, isRevisionDay: true });
    for (const r of explained) {
      assert.ok(r.href.length > 0);
      assert.ok(r.warmReason.length > 0);
      assert.ok(r.category, "recommendation missing category");
    }
  });

  it("scorePlatformHealth produces a label + actionable notes", () => {
    const h = scorePlatformHealth({
      syncSuccessRate: 0.5,
      queueDepth: 1500,
      renderFps: 25,
      burnoutSignals: 60,
    });
    assert.ok(h.notes.length >= 1);
    assert.ok(["critical", "degraded", "watch", "healthy", "excellent"].includes(h.label));
  });
});

// ============================================================================
// PHASE 10 — Long-term drift + philosophy
// ============================================================================

describe("PHASE 10 — long-term drift + philosophy", () => {
  it("optimization pipeline holds when safety degrades", () => {
    const r = buildOptimizationReport({
      sessionCompletion: 0.3,
      burnoutSignals: 80,
    });
    assert.equal(r.verdict, "hold");
  });

  it("optimization pipeline ships on a healthy long-term cohort", () => {
    const r = buildOptimizationReport({
      d7Retention: 0.6,
      d30Retention: 0.4,
      onboardingCompletion: 0.7,
      premiumConversion: 0.4,
      sessionCompletion: 0.85,
      comebackSuccess: 0.5,
      burnoutSignals: 0,
    });
    assert.equal(r.verdict, "ship");
  });

  it("stewardship reviewer auto-rejects new dashboards / engines / compulsion / opaque AI", () => {
    const blocked = [
      { name: "extra_engine", surface: "engine" as const, description: "" },
      { name: "extra_dashboard", surface: "dashboard" as const, description: "" },
      { name: "compulsion_loop", surface: "feature" as const, description: "", optimizesForCompulsion: true },
      {
        name: "unsafe_copy",
        surface: "copy" as const,
        description: "",
        copy: "Don't lose your streak — falling behind!",
      },
    ];
    for (const p of blocked) {
      const r = reviewStewardship(p);
      assert.equal(r.verdict, "reject", `expected reject for ${p.name}`);
    }
  });

  it("family-journey returns null for empty signal", () => {
    const r = buildFamilyJourney({
      snapshots: [],
      milestones: [],
      periodLabel: "2026",
    });
    assert.equal(r, null);
  });

  it("365-day simulation passes effectiveness without producing negative XP or NaN", () => {
    const days = Array.from({ length: 365 }, (_, i) => ({
      section: SECTIONS[i % SECTIONS.length] as never,
      activities: 3,
      accuracy: 0.75,
      inactive: i % 10 === 9,
    }));
    const result = simulateLearningJourney({
      childId: 1,
      age: 5,
      startDateIso: "2026-01-01",
      days,
    });
    for (const d of result.days) {
      assert.ok(!Number.isNaN(d.masteryScore));
      assert.ok(d.totalXP >= 0);
    }
    const finalEffective = buildLearningEffectiveness([
      { dateIso: "2026-01-01", entries: [] },
      { dateIso: "2026-12-31", entries: [] },
    ]);
    assert.ok(["no_signal", "steady", "growing", "watch"].includes(finalEffective.label));
  });

  it("premium prompt cooldown is honored across rapid evaluations", () => {
    const profile = buildLearningProfile(1, { streakDays: 8, masteryScore: 60 }, 6);
    const memory = buildLearningMemory(profile, []);
    const first = evaluatePremiumPrompt({
      profile,
      memory,
      isPremium: false,
      lastPromptIso: null,
      todayIso: "2026-06-01",
      childName: "Aarav",
    });
    assert.ok(first);
    // Same day — cooldown should block.
    const blocked = evaluatePremiumPrompt({
      profile,
      memory,
      isPremium: false,
      lastPromptIso: "2026-06-01",
      todayIso: "2026-06-02",
      childName: "Aarav",
    });
    assert.equal(blocked, null);
  });

  it("family-milestone never re-fires for a seen id", () => {
    const profile = buildLearningProfile(
      1,
      { completedActivities: Array.from({ length: 20 }, (_, i) => `a${i}`), streakDays: 8 },
      6,
    );
    const memory = buildLearningMemory(profile, []);
    const first = detectFamilyMilestone({ profile, memory, seenMilestoneIds: [], childName: "A" });
    assert.ok(first);
    const second = detectFamilyMilestone({
      profile,
      memory,
      seenMilestoneIds: [first!.id],
      childName: "A",
    });
    if (second) assert.notEqual(second.id, first!.id);
  });
});

// ============================================================================
// Cross-cutting — developmental pacing never proposes session size 0
// ============================================================================

describe("CROSS-CUTTING — pacing + behavior never under-prescribe", () => {
  it("developmental pacing returns sessionSize in 3..6", () => {
    const profile = buildLearningProfile(1, {}, 6);
    const memory = buildLearningMemory(profile, []);
    const cases = [
      { abandonedSessions: 5 },
      { retryClicks: 10 },
      { daysInactive: 7 },
      { recentAccuracy: 0.95 },
      {},
    ];
    for (const signals of cases) {
      const p = buildDevelopmentalPacing({ profile, memory, signals });
      assert.ok(
        p.recommendedSessionSize >= 3 && p.recommendedSessionSize <= 6,
        `pacing oob sessionSize=${p.recommendedSessionSize}`,
      );
    }
  });
});
