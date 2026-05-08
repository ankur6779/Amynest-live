/**
 * Phase 3 closed-loop learning — pure-function tests.
 *   - computeCategoryWeights normalizes correlation nets into [-1, +1]
 *     and orders by absolute weight desc.
 *   - computeSlotSuccessRates buckets by hour and counts only items with
 *     status === "complete" as done.
 *   - deriveLearningAdaptationTags emits boost/demote/weak_slot codes only
 *     when thresholds are crossed.
 *   - renderLearningWeightsForPrompt is empty when no signal qualifies.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeCategoryWeights,
  computeSlotSuccessRates,
  deriveLearningAdaptationTags,
  renderLearningWeightsForPrompt,
  type LearningWeights,
} from "./learningWeights.js";

describe("computeCategoryWeights", () => {
  it("clamps weight to [-1, +1] and rounds to 2 decimals", () => {
    const out = computeCategoryWeights([
      { category: "meal", positive: 6, negative: 0, net: 6 },
      { category: "learning", positive: 0, negative: 4, net: -4 },
    ]);
    const meal = out.find((c) => c.category === "meal")!;
    const learning = out.find((c) => c.category === "learning")!;
    assert.ok(meal.weight > 0 && meal.weight <= 1);
    assert.ok(learning.weight < 0 && learning.weight >= -1);
    assert.equal(meal.weight, Math.round((6 / 7) * 100) / 100);
    assert.equal(learning.weight, Math.round((-4 / 5) * 100) / 100);
  });

  it("dampens single-event categories so they don't dominate", () => {
    const out = computeCategoryWeights([
      { category: "play", positive: 1, negative: 0, net: 1 },
      { category: "story", positive: 4, negative: 0, net: 4 },
    ]);
    const play = out.find((c) => c.category === "play")!;
    const story = out.find((c) => c.category === "story")!;
    assert.ok(story.weight > play.weight, "more samples should outweigh single event");
  });

  it("orders by absolute weight desc", () => {
    const out = computeCategoryWeights([
      { category: "a", positive: 1, negative: 1, net: 0 },
      { category: "b", positive: 5, negative: 0, net: 5 },
      { category: "c", positive: 0, negative: 3, net: -3 },
    ]);
    assert.deepEqual(
      out.map((c) => c.category),
      ["b", "c", "a"],
    );
  });
});

describe("computeSlotSuccessRates", () => {
  it("counts only status=complete items as done; sorted by hour", () => {
    const routines = [
      {
        items: [
          { time: "08:00", category: "meal", status: "complete", activity: "x", duration: 30 },
          { time: "08:30", category: "wake", status: "skip", activity: "y", duration: 5 },
          { time: "14:00", category: "learning", status: "complete", activity: "z", duration: 45 },
          { time: "14:30", category: "play", status: "delay", activity: "w", duration: 30 },
        ],
      },
      {
        items: [
          { time: "08:00", category: "meal", status: "complete", activity: "x", duration: 30 },
          { time: "14:00", category: "learning", activity: "z", duration: 45 },
        ],
      },
    ];
    const out = computeSlotSuccessRates(routines);
    assert.deepEqual(
      out.map((s) => s.hour),
      [8, 14],
    );
    const eight = out.find((s) => s.hour === 8)!;
    assert.equal(eight.sample, 3);
    assert.equal(eight.completionRate, Math.round((2 / 3) * 100));
    const fourteen = out.find((s) => s.hour === 14)!;
    assert.equal(fourteen.sample, 3);
    assert.equal(fourteen.completionRate, Math.round((1 / 3) * 100));
  });

  it("ignores malformed times and non-array items", () => {
    const out = computeSlotSuccessRates([
      { items: null },
      { items: [{ time: "bad", status: "complete" } as unknown as Record<string, unknown>] },
      { items: [{ time: "25:00", status: "complete" } as unknown as Record<string, unknown>] },
    ]);
    assert.deepEqual(out, []);
  });
});

describe("deriveLearningAdaptationTags", () => {
  const baseW: LearningWeights = {
    childId: 1,
    categoryWeights: [
      { category: "meal", weight: 0.5, positive: 5, negative: 1 },
      { category: "screens", weight: -0.4, positive: 1, negative: 5 },
      { category: "play", weight: 0.1, positive: 2, negative: 1 },
    ],
    slotSuccess: [
      { hour: 14, completionRate: 30, sample: 5 },
      { hour: 9, completionRate: 80, sample: 5 },
      { hour: 17, completionRate: 20, sample: 2 },
    ],
    lastComputedAt: new Date().toISOString(),
    sample: 12,
  };

  it("emits boost/demote/weak_slot tags only past thresholds", () => {
    const tags = deriveLearningAdaptationTags(baseW);
    assert.ok(tags.includes("learning:boost:meal"));
    assert.ok(tags.includes("learning:demote:screens"));
    assert.ok(tags.includes("learning:weak_slot:14"));
    assert.ok(!tags.some((t) => t.includes("play")), "below threshold should not tag");
    assert.ok(!tags.includes("learning:weak_slot:17"), "sample<3 should not tag");
    assert.ok(!tags.includes("learning:weak_slot:9"), "good rate should not tag");
  });

  it("returns empty for null input", () => {
    assert.deepEqual(deriveLearningAdaptationTags(null), []);
  });

  it("returns empty when sample is below the evidence threshold", () => {
    const lowSample: LearningWeights = { ...baseW, sample: 4 };
    assert.deepEqual(deriveLearningAdaptationTags(lowSample), []);
  });
});

describe("renderLearningWeightsForPrompt", () => {
  it("returns empty string when no signals qualify", () => {
    const out = renderLearningWeightsForPrompt({
      childId: 1,
      categoryWeights: [{ category: "meal", weight: 0.1, positive: 1, negative: 0 }],
      slotSuccess: [{ hour: 10, completionRate: 90, sample: 4 }],
      lastComputedAt: new Date().toISOString(),
      sample: 4,
    });
    assert.equal(out, "");
  });

  it("renders a non-empty block with BOOST/REDUCE lines when strong weights exist and sample is sufficient", () => {
    const out = renderLearningWeightsForPrompt({
      childId: 1,
      categoryWeights: [
        { category: "outdoor", weight: 0.6, positive: 6, negative: 0 },
        { category: "screens", weight: -0.5, positive: 0, negative: 4 },
      ],
      slotSuccess: [],
      lastComputedAt: new Date().toISOString(),
      sample: 12,
    });
    assert.ok(out.includes("BOOST"));
    assert.ok(out.includes("REDUCE"));
    assert.ok(out.includes("outdoor"));
    assert.ok(out.includes("screens"));
  });

  it("returns empty when sample is below the evidence threshold even with strong weights", () => {
    const out = renderLearningWeightsForPrompt({
      childId: 1,
      categoryWeights: [{ category: "outdoor", weight: 0.6, positive: 6, negative: 0 }],
      slotSuccess: [],
      lastComputedAt: new Date().toISOString(),
      sample: 3,
    });
    assert.equal(out, "");
  });
});
