import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAnalyticsReport } from "../test-fixtures.js";
import { planCampaignSeries } from "../campaigns/index.js";
import { buildContentMemory } from "../memory/index.js";
import { buildOptimizationDecision } from "../optimizer/index.js";
import { rankCategories, rankTopics } from "../ranking/index.js";
import {
  buildBrainRecommendations,
  buildPublishingCalendar,
  buildPublishingSchedule,
} from "./engine.js";

describe("campaign planner schedule and recommendations", () => {
  it("builds a 30-day publishing schedule and calendar", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({
      analytics,
      publishedTopicIds: ["parenting-001"],
      learningWindowDays: 60,
      now: new Date("2026-07-27T10:00:00.000Z"),
    });
    const rankedTopics = rankTopics({
      analytics,
      memory,
      confidenceThreshold: 0.55,
    });
    const rankedCategories = rankCategories(analytics);
    const optimization = buildOptimizationDecision({
      analytics,
      memory,
      rankedTopics,
      rankedCategories,
      enabled: true,
    });
    const series = planCampaignSeries({
      optimization,
      seasonalEvents: [],
      trendSignals: [],
    });

    const schedule = buildPublishingSchedule({
      startDate: "2026-07-28",
      horizonDays: 30,
      series,
      rankedTopics,
      memory,
      optimization,
      analytics,
      predictionEnabled: true,
    });

    assert.ok(schedule.length > 0);
    assert.ok(schedule.every((s) => s.date >= "2026-07-28"));
    assert.ok(schedule.every((s) => s.date <= "2026-08-26"));
    assert.ok(schedule.every((s) => [15, 20, 30].includes(s.durationSeconds)));
    assert.ok(schedule.every((s) => s.predicted.confidence >= 0));

    const calendar = buildPublishingCalendar(schedule);
    assert.ok(calendar.length > 0);
    assert.ok(calendar.every((d) => d.slotCount >= 1));

    const recommendations = buildBrainRecommendations({
      optimization,
      series,
      memory,
    });
    assert.ok(recommendations.length > 0);
    assert.ok(recommendations.some((r) => /increase|reduce|prefer|publish|hook|demo|cta|video/i.test(r.message)));
  });
});
