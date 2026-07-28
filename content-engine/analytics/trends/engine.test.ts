import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockAnalyticsProvider } from "../providers/mock.js";
import { scoreTopic } from "../scoring/index.js";
import { detectTrends } from "./engine.js";

describe("analytics trend detection", () => {
  it("detects high-performing categories and publish-time effectiveness", async () => {
    const provider = new MockAnalyticsProvider({ seed: "trends" });
    const metrics = [
      await provider.video("v1"),
      await provider.video("v2"),
      await provider.video("v3"),
    ];
    const topicScores = [
      scoreTopic({
        topicId: "parenting-001",
        topicTitle: "Parenting tip",
        category: "Parenting",
        metrics: [metrics[0]!, metrics[1]!],
      }),
      scoreTopic({
        topicId: "astro-topic",
        topicTitle: "Amy Astro tip",
        category: "Amy Astro",
        metrics: [metrics[2]!],
      }),
    ];

    const trends = detectTrends({
      videos: [
        {
          videoId: "v1",
          topicId: "parenting-001",
          category: "Parenting",
          videoStyle: "short",
          publishHour: 9,
          metrics: metrics[0]!,
          topicScore: topicScores[0]!.score.overall,
        },
        {
          videoId: "v2",
          topicId: "parenting-001",
          category: "Parenting",
          videoStyle: "short",
          publishHour: 9,
          metrics: metrics[1]!,
          topicScore: topicScores[0]!.score.overall,
        },
        {
          videoId: "v3",
          topicId: "astro-topic",
          category: "Amy Astro",
          videoStyle: "astro",
          publishHour: 18,
          metrics: metrics[2]!,
          topicScore: topicScores[1]!.score.overall,
        },
      ],
      topicScores,
      minimumSampleSize: 1,
    });

    assert.ok(trends.highPerformingCategories.length >= 1);
    assert.ok(trends.publishingTimeEffectiveness.length >= 1);
    assert.ok(Array.isArray(trends.decliningTopics));
    assert.ok(Array.isArray(trends.seasonalSpikes));
  });
});
