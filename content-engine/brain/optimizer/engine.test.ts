import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAnalyticsReport } from "../test-fixtures.js";
import { buildContentMemory } from "../memory/index.js";
import { rankCategories, rankTopics } from "../ranking/index.js";
import { buildOptimizationDecision } from "./engine.js";

describe("optimization engine", () => {
  it("optimizes topic duration hook cta publish time style and pacing", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({
      analytics,
      learningWindowDays: 60,
      now: new Date("2026-07-27T10:00:00.000Z"),
    });
    const rankedTopics = rankTopics({
      analytics,
      memory,
      confidenceThreshold: 0.55,
    });
    const rankedCategories = rankCategories(analytics);
    const decision = buildOptimizationDecision({
      analytics,
      memory,
      rankedTopics,
      rankedCategories,
      enabled: true,
    });

    assert.ok([15, 20, 30].includes(decision.videoDurationSeconds));
    assert.ok(["question", "bold-claim", "story"].includes(decision.openingHookStyle));
    assert.ok(["soft", "direct", "app-demo"].includes(decision.ctaStyle));
    assert.ok(decision.publishHour >= 0 && decision.publishHour <= 23);
    assert.ok(decision.videoStyle);
    assert.ok(["calm", "balanced", "brisk"].includes(decision.scenePace));
    assert.ok(Array.isArray(decision.topicSelection.preferCategories));
    assert.ok(Array.isArray(decision.topicSelection.reduceCategories));
    assert.ok(decision.signals.length > 0);
  });

  it("omits optimization signals when disabled", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({ analytics, learningWindowDays: 60 });
    const decision = buildOptimizationDecision({
      analytics,
      memory,
      rankedTopics: [],
      rankedCategories: [],
      enabled: false,
    });
    assert.equal(decision.signals.length, 0);
  });
});
