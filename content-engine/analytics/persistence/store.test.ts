import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AnalyticsReport, LearningStoreSnapshot } from "../../types/analytics.js";
import { InMemoryAnalyticsStore } from "./store.js";

describe("analytics persistence", () => {
  it("stores reports learning and topic scores", () => {
    const store = new InMemoryAnalyticsStore();
    const report = {
      id: "ar_1",
      version: "8.0.0",
      createdAt: new Date().toISOString(),
      schedule: "daily",
      channelSummary: {
        metrics: {
          collectedAt: new Date().toISOString(),
          subscribers: 1,
          views: 1,
          watchTimeMinutes: 1,
          averageViewDurationSeconds: 1,
          estimatedRevenue: 0,
          shortsViews: 1,
          videosPublished: 1,
        },
        shorts: {
          collectedAt: new Date().toISOString(),
          views: 1,
          averageViewDurationSeconds: 1,
          swipeAwayRate: 0,
          engagedViews: 1,
        },
        topVideoIds: [],
        worstVideoIds: [],
        growthSummary: "ok",
      },
      videoSummaries: [],
      topicScores: [],
      contentScores: [],
      recommendations: [],
      learningUpdates: {
        topicPerformance: [],
        categoryTrends: [],
        publishingTimes: [],
        videoStyles: [],
        audiencePreferences: [],
        updatedAt: new Date().toISOString(),
      },
      trends: {
        highPerformingCategories: [],
        decliningTopics: [],
        seasonalSpikes: [],
        publishingTimeEffectiveness: [],
      },
      periodReport: {
        schedule: "daily",
        periodStart: "2026-07-26",
        periodEnd: "2026-07-27",
        topVideos: [],
        worstVideos: [],
        growthSummary: "ok",
        averageViews: 0,
        averageCtr: 0,
        averageRetention: 0,
      },
      optimizationSignals: [],
      telemetry: {
        apiLatencyMs: 1,
        collectionDurationMs: 1,
        missingMetrics: 0,
        errors: [],
        provider: "mock",
        videosAnalyzed: 0,
      },
    } satisfies AnalyticsReport;

    store.saveReport(report);
    assert.equal(store.getReport("ar_1")?.id, "ar_1");

    const learning: LearningStoreSnapshot = {
      topicPerformance: [],
      categoryTrends: [],
      publishingTimes: [],
      videoStyles: [],
      audiencePreferences: [],
      updatedAt: new Date().toISOString(),
    };
    store.saveLearning(learning);
    assert.ok(store.getLearning());
    store.saveTopicScores([
      {
        topicId: "t1",
        topicTitle: "T",
        category: "Parenting",
        sampleSize: 1,
        score: {
          performance: 50,
          retention: 50,
          engagement: 50,
          growth: 50,
          freshness: 50,
          overall: 50,
        },
        updatedAt: new Date().toISOString(),
      },
    ]);
    assert.equal(store.getTopicScores().length, 1);
  });
});
