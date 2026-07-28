import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeContentPackage } from "../test-fixtures.js";
import { MockAnalyticsProvider } from "../providers/mock.js";
import { scoreContent, scoreTopic } from "../scoring/index.js";
import { detectTrends } from "../trends/index.js";
import { buildOptimizationSignals, buildRecommendations } from "./engine.js";

describe("analytics recommendations", () => {
  it("generates growth recommendations and optimization signals", async () => {
    const provider = new MockAnalyticsProvider({ seed: "recs" });
    const metrics = await provider.video("r1");
    const topicScores = [
      scoreTopic({
        topicId: "parenting-001",
        topicTitle: "Parenting tip",
        category: "Parenting",
        metrics: [metrics],
      }),
      scoreTopic({
        topicId: "astro-1",
        topicTitle: "Amy Astro app demo",
        category: "Amy Astro",
        metrics: [metrics],
      }),
    ];
    const contentScores = [
      scoreContent({
        videoId: "r1",
        topicId: "parenting-001",
        content: makeContentPackage({
          hook: "Hi",
          cta: "link",
          title: "x",
          description: "short",
          hashtags: ["a"],
        }),
        metrics,
        durationSeconds: 55,
        sceneCount: 2,
      }),
    ];
    const trends = detectTrends({
      videos: [
        {
          videoId: "r1",
          topicId: "parenting-001",
          category: "Parenting",
          videoStyle: "short",
          publishHour: 9,
          metrics,
          topicScore: topicScores[0]!.score.overall,
        },
      ],
      topicScores,
      minimumSampleSize: 1,
    });

    const recommendations = buildRecommendations({
      topicScores,
      contentScores,
      trends,
      minimumSampleSize: 1,
    });
    assert.ok(recommendations.length >= 1);
    assert.ok(recommendations.some((r) => typeof r.message === "string"));

    const signals = buildOptimizationSignals(recommendations, true);
    assert.equal(signals.length, recommendations.length);
    assert.equal(buildOptimizationSignals(recommendations, false).length, 0);
  });
});
