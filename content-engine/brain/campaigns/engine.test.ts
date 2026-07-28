import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAnalyticsReport } from "../test-fixtures.js";
import { buildContentMemory } from "../memory/index.js";
import { buildOptimizationDecision } from "../optimizer/index.js";
import { rankCategories, rankTopics } from "../ranking/index.js";
import { listSeasonalEvents } from "../seasonal/index.js";
import { MockTrendProvider } from "../trends/mock.js";
import { planCampaignSeries } from "./engine.js";

const REQUIRED_SERIES = [
  "Parenting Series",
  "Astro Series",
  "Speech Series",
  "Health Series",
  "Weekend Activities",
  "Family Challenges",
  "Feature Releases",
  "Premium Campaigns",
  "Seasonal Campaigns",
  "Educational Series",
] as const;

describe("campaign planner series", () => {
  it("generates all supported campaign series kinds", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({ analytics, learningWindowDays: 60 });
    const optimization = buildOptimizationDecision({
      analytics,
      memory,
      rankedTopics: rankTopics({
        analytics,
        memory,
        confidenceThreshold: 0.55,
      }),
      rankedCategories: rankCategories(analytics),
      enabled: true,
    });
    const seasonalEvents = listSeasonalEvents("IN", 2026);
    const trendSignals = await new MockTrendProvider().fetchTrends({
      region: "IN",
      limit: 5,
    });

    const series = planCampaignSeries({
      optimization,
      seasonalEvents,
      trendSignals,
    });

    const kinds = new Set(series.map((s) => s.kind));
    for (const kind of REQUIRED_SERIES) {
      assert.ok(kinds.has(kind), `missing series ${kind}`);
    }
    assert.ok(series.every((s) => s.slotsPerWeek >= 1));
    assert.ok(series.every((s) => s.priority > 0));
  });
});
