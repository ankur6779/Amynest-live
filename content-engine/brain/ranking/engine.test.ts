import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAnalyticsReport } from "../test-fixtures.js";
import { buildContentMemory } from "../memory/index.js";
import { planCampaignSeries } from "../campaigns/index.js";
import { buildOptimizationDecision } from "../optimizer/index.js";
import {
  boostTopicsWithTrends,
  rankCampaigns,
  rankCategories,
  rankCtas,
  rankHooks,
  rankPublishingSlots,
  rankTopics,
} from "./engine.js";
import { MockTrendProvider } from "../trends/mock.js";

describe("ranking engine", () => {
  it("ranks topics categories hooks ctas campaigns and slots with confidence", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({
      analytics,
      publishedTopicIds: ["parenting-001"],
      learningWindowDays: 60,
      now: new Date("2026-07-27T10:00:00.000Z"),
    });
    const topics = rankTopics({
      analytics,
      memory,
      confidenceThreshold: 0.55,
    });
    const categories = rankCategories(analytics);
    const hooks = rankHooks(memory);
    const ctas = rankCtas(memory);
    const optimization = buildOptimizationDecision({
      analytics,
      memory,
      rankedTopics: topics,
      rankedCategories: categories,
      enabled: true,
    });
    const series = planCampaignSeries({
      optimization,
      seasonalEvents: [],
      trendSignals: [],
    });
    const campaigns = rankCampaigns(series);
    const slots = rankPublishingSlots(memory, analytics);

    for (const list of [topics, categories, campaigns, slots]) {
      assert.ok(list.length > 0);
      for (const item of list) {
        assert.ok(item.score >= 0);
        assert.ok(item.confidence >= 0 && item.confidence <= 1);
        assert.ok(item.rationale.length > 0);
      }
    }
    assert.ok(Array.isArray(hooks));
    assert.ok(Array.isArray(ctas));
  });

  it("boosts topics using trend signals", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({ analytics, learningWindowDays: 60 });
    const topics = rankTopics({
      analytics,
      memory,
      confidenceThreshold: 0.4,
    });
    const trends = await new MockTrendProvider().fetchTrends({
      region: "IN",
      limit: 5,
    });
    const boosted = boostTopicsWithTrends(topics, trends);
    assert.equal(boosted.length, topics.length);
    assert.ok(boosted.every((t) => typeof t.score === "number"));
  });
});
