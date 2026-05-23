import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { computeAge, getCountryLearningThreshold } from "./ageEngine.js";
import { filterEligibleModules } from "./moduleEngine.js";
import { recordContentView, selectContent } from "./contentEngine.js";
import { assembleDailyPlan, dailyPlanCacheKey } from "./rotationEngine.js";
import { getDailyPlan } from "./orchestrator.js";
import { MemoryCacheAdapter } from "./cache/memoryCache.js";
import { computeAnalyticsSnapshot, clearAnalyticsEvents } from "./analytics.js";
import { getPoolsForModule, indexPoolsByModule } from "./mock/content-pools.js";
import { DEFAULT_ANTI_REPETITION } from "./config/global-defaults.js";

describe("ageEngine", () => {
  it("computes age in months and band from DOB", () => {
    const ref = new Date("2026-05-23");
    const dob = new Date("2024-05-23");
    const out = computeAge({ childDOB: dob, countryCode: "US", referenceDate: ref });
    assert.equal(out.ageInMonths, 24);
    assert.equal(out.ageBand, "24_36");
    assert.equal(out.developmentStage, "toddler");
  });

  it("applies India phonics start at 24m vs US at 30m", () => {
    assert.equal(getCountryLearningThreshold("IN", "phonicsStart"), 24);
    assert.equal(getCountryLearningThreshold("US", "phonicsStart"), 30);
    const inAge = computeAge({
      childDOB: new Date("2024-03-01"),
      countryCode: "IN",
      referenceDate: new Date("2026-03-01"),
    });
    const usAge = computeAge({
      childDOB: new Date("2024-03-01"),
      countryCode: "US",
      referenceDate: new Date("2026-03-01"),
    });
    assert.equal(inAge.effectivePhonicsStart, 24);
    assert.equal(usAge.effectivePhonicsStart, 30);
  });
});

describe("moduleEngine", () => {
  it("filters phonics preview for US child under 30m", () => {
    const age = computeAge({
      childDOB: new Date("2024-01-01"),
      countryCode: "US",
      referenceDate: new Date("2026-05-01"),
    });
    assert.equal(age.developmentStage, "toddler");
    assert.ok(age.ageInMonths < 30);
    const mods = filterEligibleModules({
      age,
      countryCode: "US",
      unlockedModules: ["phonics"],
    });
    const phonics = mods.find((m) => m.moduleId === "phonics");
    assert.ok(phonics);
    assert.equal(phonics!.previewOnly, true);
    assert.equal(phonics!.reason, "country_phonics_threshold");
  });

  it("includes phonics for IN child at 24m+", () => {
    const age = computeAge({
      childDOB: new Date("2024-05-01"),
      countryCode: "IN",
      referenceDate: new Date("2026-05-01"),
    });
    const mods = filterEligibleModules({
      age,
      countryCode: "IN",
      unlockedModules: ["phonics"],
    });
    const phonics = mods.find((m) => m.moduleId === "phonics");
    assert.ok(phonics);
    assert.equal(phonics!.previewOnly, false);
  });
});

describe("contentEngine anti-repetition", () => {
  it("prefers never-seen content", () => {
    const pools = getPoolsForModule("phonics", "24_36", "IN");
    const history = [
      {
        childId: "c1",
        contentId: pools[0]!.contentVariants[0]!.contentId,
        moduleId: "phonics" as const,
        lastSeenAt: new Date().toISOString(),
        seenCount: 5,
        completionStatus: "completed" as const,
      },
    ];
    const selected = selectContent({
      childId: "c1",
      moduleId: "phonics",
      ageBand: "24_36",
      countryCode: "IN",
      count: 4,
      history,
      pool: pools,
      antiRepetition: DEFAULT_ANTI_REPETITION,
      referenceDate: new Date(),
    });
    assert.equal(selected.length, 4);
    assert.ok(
      selected.every((s) => s.contentId !== history[0]!.contentId),
      "heavily seen content should be deprioritized/excluded",
    );
  });

  it("records view history with incrementing seenCount", () => {
    let history: ReturnType<typeof recordContentView> = [];
    history = recordContentView(history, {
      childId: "c1",
      contentId: "x1",
      moduleId: "phonics",
      lastSeenAt: "2026-05-20T00:00:00.000Z",
      completionStatus: "started",
    });
    history = recordContentView(history, {
      childId: "c1",
      contentId: "x1",
      moduleId: "phonics",
      lastSeenAt: "2026-05-21T00:00:00.000Z",
      completionStatus: "completed",
    });
    assert.equal(history[0]!.seenCount, 2);
  });
});

describe("rotationEngine + getDailyPlan", () => {
  beforeEach(() => {
    clearAnalyticsEvents();
  });

  it("builds daily plan with multiple modules and content ids", () => {
    const age = computeAge({
      childDOB: new Date("2023-01-01"),
      countryCode: "IN",
      referenceDate: new Date("2026-05-23"),
    });
    const plan = assembleDailyPlan({
      childId: "child-1",
      dateIso: "2026-05-23",
      age,
      countryCode: "IN",
      poolsByModule: indexPoolsByModule(age.ageBand, "IN"),
      history: [],
      unlockedModules: ["phonics", "motor_skills", "language"],
    });
    assert.ok(plan.modules.length > 0);
    assert.ok(plan.contentIds.length > 0);
    assert.equal(plan.cacheKey, dailyPlanCacheKey("child-1", "2026-05-23", "IN"));
  });

  it("caches daily plan per child/date/country", async () => {
    const cache = new MemoryCacheAdapter();
    const input = {
      childId: "child-cache",
      childDOB: new Date("2023-06-01"),
      countryCode: "US" as const,
      dateIso: "2026-05-23",
      cache,
      unlockedModules: ["phonics" as const, "stories" as const],
    };
    const a = await getDailyPlan(input);
    const b = await getDailyPlan(input);
    assert.deepEqual(a.contentIds, b.contentIds);
    assert.equal(a.generatedAt, b.generatedAt);
  });

  it("mock pools have at least 30 items per module band", () => {
    const pools = getPoolsForModule("motor_skills", "36_48", "IN");
    const total = pools.reduce((n, p) => n + p.contentVariants.length, 0);
    assert.ok(total >= 30, `expected >= 30 items, got ${total}`);
  });
});

describe("analytics", () => {
  it("computes repeat exposure from history", () => {
    const snap = computeAnalyticsSnapshot(
      [
        {
          childId: "c1",
          contentId: "a",
          moduleId: "phonics",
          lastSeenAt: "2026-05-01",
          seenCount: 3,
          completionStatus: "completed",
          engagementScore: 30,
        },
        {
          childId: "c1",
          contentId: "b",
          moduleId: "phonics",
          lastSeenAt: "2026-05-02",
          seenCount: 1,
          completionStatus: "completed",
          engagementScore: 80,
        },
      ],
      ["phonics"],
    );
    assert.equal(snap.repeatExposurePct, 50);
    assert.ok(snap.contentFatigueRate >= 0);
  });
});
