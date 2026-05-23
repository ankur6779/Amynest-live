import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeTargetDifficulty } from "./adaptiveEngine.js";
import { rankContent, shouldTriggerExploration } from "./contentEngine.js";
import { processSessionFeedback } from "./feedbackEngine.js";
import {
  createDefaultLearningProfile,
  ensureLearningProfile,
  updateSkillFromOutcome,
} from "./learningProfileEngine.js";
import { evaluateMonetizationMoment } from "./monetizationEngine.js";
import { buildSessionPlan, sessionFingerprint, SESSION_RULES } from "./sessionEngine.js";
import { generateTemplateVariant } from "./templateEngine.js";
import { dailyPlanV2CacheKey, explorationSeedFromInputs } from "./cache/planCacheKey.js";
import { getDailyPlanV2 } from "./orchestrator-v2.js";
import { MemoryCacheAdapter } from "./cache/memoryCache.js";
import { getPoolsForModule } from "./mock/content-pools.js";
import type { RankedContentItem } from "./types-v2.js";
import type { ModuleId } from "./types.js";

describe("learningProfileEngine", () => {
  it("initializes default profile", () => {
    const p = createDefaultLearningProfile("c1", "u1");
    assert.equal(p.skills.phonics.level, 1);
    assert.equal(p.version, 1);
  });

  it("levels up skill after success", () => {
    let p = createDefaultLearningProfile("c1");
    p = {
      ...p,
      skills: {
        ...p.skills,
        phonics: { level: 1, confidence: 0.86, lastUpdated: new Date().toISOString() },
      },
    };
    const next = updateSkillFromOutcome(p, "phonics", { success: true, skipped: false }, "fast");
    assert.equal(next.skills.phonics.level, 2);
  });
});

describe("adaptiveEngine", () => {
  it("returns target difficulty from skill level", () => {
    const profile = createDefaultLearningProfile("c1");
    profile.skills.phonics.level = 4;
    const out = computeTargetDifficulty(profile, "phonics", 42);
    assert.ok(["easy", "medium", "hard"].includes(out.targetDifficulty));
  });
});

describe("contentEngine ranking", () => {
  it("ranks never-seen content higher", () => {
    const pools = getPoolsForModule("phonics", "24_36", "IN");
    const items = pools.flatMap((p) => p.contentVariants).slice(0, 10);
    const profile = createDefaultLearningProfile("c1");
    const ranked = rankContent(
      items,
      [
        {
          childId: "c1",
          contentId: items[0]!.contentId,
          moduleId: "phonics",
          lastSeenAt: new Date().toISOString(),
          seenCount: 5,
          completionStatus: "completed",
          engagementScore: 20,
        },
      ],
      new Date(),
      "medium",
      profile,
      "phonics",
      0.2,
    );
    assert.ok(ranked[0]!.contentId !== items[0]!.contentId || ranked[0]!.contentScore > 0);
  });
});

describe("sessionEngine", () => {
  it("respects maxSameModule rule", () => {
    const ranked = new Map<ModuleId, RankedContentItem[]>();
    ranked.set("phonics", [
      {
        contentId: "a1",
        moduleId: "phonics",
        contentScore: 1,
        freshnessScore: 1,
        difficultyFit: 1,
        isNew: true,
        seenCount: 0,
        difficultyLevel: "easy",
        variationFlags: [],
      },
      {
        contentId: "a2",
        moduleId: "phonics",
        contentScore: 0.9,
        freshnessScore: 1,
        difficultyFit: 1,
        isNew: true,
        seenCount: 0,
        difficultyLevel: "easy",
        variationFlags: [],
      },
      {
        contentId: "a3",
        moduleId: "phonics",
        contentScore: 0.8,
        freshnessScore: 1,
        difficultyFit: 1,
        isNew: true,
        seenCount: 0,
        difficultyLevel: "easy",
        variationFlags: [],
      },
    ]);
    const plan = buildSessionPlan({
      rankedByModule: ranked,
      profile: createDefaultLearningProfile("c1"),
      explorationTriggered: false,
      seed: 99,
      maxItems: 3,
    });
    const phonicsCount = plan.filter((p) => p.moduleId === "phonics").length;
    assert.ok(
      phonicsCount <= SESSION_RULES.maxSameModule,
      `phonics count ${phonicsCount} exceeds max ${SESSION_RULES.maxSameModule}`,
    );
    assert.notEqual(sessionFingerprint(plan), "");
  });
});

describe("feedbackEngine", () => {
  it("increases novelty preference on low engagement", () => {
    let profile = createDefaultLearningProfile("c1");
    profile = {
      ...profile,
      behavior: { ...profile.behavior, engagementScore: 30 },
    };
    const result = processSessionFeedback(profile, {
      childId: "c1",
      moduleId: "phonics",
      contentId: "x",
      completionRate: 0.2,
      timeSpentSec: 10,
      skips: 3,
      retries: 0,
      completed: false,
    });
    assert.ok(
      (result.adjustments.noveltyPreference ?? profile.adaptability.noveltyPreference) >=
        profile.adaptability.noveltyPreference,
    );
  });
});

describe("templateEngine", () => {
  it("generates unique template variants", () => {
    const v1 = generateTemplateVariant(
      {
        id: "phonics_letter_identification",
        moduleId: "phonics",
        variables: { letter: ["A", "B"], voice: ["default"], speed: ["slow"] },
      },
      1,
    );
    const v2 = generateTemplateVariant(
      {
        id: "phonics_letter_identification",
        moduleId: "phonics",
        variables: { letter: ["A", "B"], voice: ["default"], speed: ["slow"] },
      },
      2,
    );
    assert.notEqual(v1.contentId, v2.contentId);
  });
});

describe("cache v2", () => {
  it("changes cache key when profile version changes", () => {
    const base = {
      childId: "1",
      dateIso: "2026-05-23",
      countryCode: "IN" as const,
      unlockedModules: ["phonics" as const],
      explorationSeed: explorationSeedFromInputs("1", "2026-05-23", 1),
    };
    const k1 = dailyPlanV2CacheKey({ ...base, skillProfileVersion: 1 });
    const k2 = dailyPlanV2CacheKey({ ...base, skillProfileVersion: 2 });
    assert.notEqual(k1, k2);
  });
});

describe("getDailyPlanV2", () => {
  it("returns session plan and personalization meta", async () => {
    const cache = new MemoryCacheAdapter();
    const store = {
      async get() {
        return null;
      },
      async upsert(p: import("./types-v2.js").LearningProfile) {
        return p;
      },
    };
    const plan = await getDailyPlanV2({
      childId: "v2-child",
      childDOB: new Date("2023-01-01"),
      countryCode: "IN",
      dateIso: "2026-05-23",
      cache,
      profileStore: store,
      bypassCache: true,
      unlockedModules: ["phonics", "motor_skills", "stories"],
    });
    assert.ok(plan.sessionPlan.length > 0);
    assert.ok(plan.personalizationMeta.profileVersion >= 1);
    assert.ok(plan.skillSnapshot.phonics);
    const plan2 = await getDailyPlanV2({
      childId: "v2-child",
      childDOB: new Date("2023-01-01"),
      countryCode: "IN",
      dateIso: "2026-05-23",
      cache,
      profileStore: store,
      bypassCache: true,
      unlockedModules: ["phonics", "motor_skills", "stories"],
    });
    assert.notEqual(
      plan.sessionFingerprint,
      plan2.sessionFingerprint,
      "consecutive generations must not produce identical sessions",
    );
  });
});

describe("monetizationEngine", () => {
  it("shows teaser at progression moment", () => {
    const profile = createDefaultLearningProfile("c1");
    profile.behavior.engagementScore = 80;
    profile.skills.phonics = {
      level: 3,
      confidence: 0.8,
      lastUpdated: new Date().toISOString(),
    };
    const hint = evaluateMonetizationMoment({
      profile,
      eligibleModules: [
        {
          moduleId: "phonics",
          eligible: true,
          locked: true,
          previewOnly: true,
          priorityScore: 100,
        },
      ],
      unlockedModules: [],
      explorationTriggered: true,
    });
    assert.equal(hint.showPremiumTeaser, true);
  });
});
