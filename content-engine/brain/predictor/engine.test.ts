import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAnalyticsReport } from "../test-fixtures.js";
import {
  aggregateExpectedPerformance,
  predictPerformance,
} from "./engine.js";

describe("prediction engine", () => {
  it("estimates views retention ctr engagement and confidence", async () => {
    const analytics = await makeAnalyticsReport();
    const prediction = predictPerformance({
      analytics,
      category: "Parenting",
      videoStyle: "short",
      durationSeconds: 20,
      publishHour: 20,
      topicRank: {
        id: "parenting-001",
        label: "Parenting tip",
        score: 80,
        confidence: 0.7,
        rationale: "test",
      },
      enabled: true,
    });

    assert.ok(prediction.expectedViews > 0);
    assert.ok(prediction.expectedRetention > 0);
    assert.ok(prediction.expectedCtr > 0);
    assert.ok(prediction.expectedEngagement > 0);
    assert.ok(prediction.confidence > 0 && prediction.confidence <= 1);
  });

  it("returns zeroed prediction when disabled", async () => {
    const analytics = await makeAnalyticsReport();
    const prediction = predictPerformance({
      analytics,
      category: "Parenting",
      videoStyle: "short",
      durationSeconds: 20,
      publishHour: 20,
      enabled: false,
    });
    assert.equal(prediction.expectedViews, 0);
    assert.equal(prediction.confidence, 0);
  });

  it("aggregates expected performance across slots", async () => {
    const analytics = await makeAnalyticsReport();
    const a = predictPerformance({
      analytics,
      category: "Parenting",
      videoStyle: "short",
      durationSeconds: 20,
      publishHour: 20,
      enabled: true,
    });
    const b = predictPerformance({
      analytics,
      category: "Amy Astro",
      videoStyle: "astro",
      durationSeconds: 30,
      publishHour: 8,
      enabled: true,
    });
    const agg = aggregateExpectedPerformance([a, b]);
    assert.ok(agg.expectedViews >= a.expectedViews);
    assert.ok(agg.confidence > 0);
  });
});
