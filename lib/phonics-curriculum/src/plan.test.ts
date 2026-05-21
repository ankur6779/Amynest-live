import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateDailyPlan } from "./plan.js";
import { applyTestOutcome } from "./progression.js";
import { buildWeeklyTestMix } from "./weekly.js";
import type { ChildCurriculumProgress } from "./types.js";

const base: ChildCurriculumProgress = {
  childId: 1,
  userId: "u1",
  currentLevel: 2,
  masteryScore: 70,
  weakPhonemes: ["ɪ"],
  streak: 3,
  lastPlayedAt: "2026-05-20T10:00:00.000Z",
  lastTestScore: 60,
  lastTestAt: null,
};

describe("phonics-curriculum plan", () => {
  it("generates 2 practice, 1 revision, 1 test", () => {
    const plan = generateDailyPlan({
      progress: base,
      dateIso: "2026-05-21",
      seed: 42,
    });
    assert.equal(plan.practice.length, 2);
    assert.equal(plan.revision.length, 1);
    assert.equal(plan.test.kind, "daily_test");
    assert.ok(plan.practice[0]!.label.toLowerCase().includes("blend") || plan.practice[0]!.target);
  });

  it("level ups when mastery crosses 85 after strong test", () => {
    const high = { ...base, masteryScore: 82 };
    const out = applyTestOutcome(high, { scorePct: 90, weakConceptIds: [] });
    assert.equal(out.currentLevel, 3);
    assert.equal(out.levelChanged, true);
  });

  it("weekly mix respects 40/30/30 split", () => {
    const mix = buildWeeklyTestMix({
      count: 20,
      currentLevel: 3,
      weakPhonemes: ["ɪ"],
      seed: 1,
    });
    assert.equal(mix.length, 20);
    const current = mix.filter((m) => m.bucket === "current").length;
    const prev = mix.filter((m) => m.bucket === "previous").length;
    const weak = mix.filter((m) => m.bucket === "weak").length;
    assert.equal(current, 8);
    assert.equal(prev, 6);
    assert.equal(weak, 6);
  });
});
