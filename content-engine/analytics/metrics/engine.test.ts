import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockAnalyticsProvider } from "../providers/mock.js";
import { aggregateVideoMetrics, rankVideosByViews } from "./engine.js";

describe("analytics metrics aggregation", () => {
  it("aggregates views retention ctr and engagement", async () => {
    const provider = new MockAnalyticsProvider({ seed: "agg" });
    const a = await provider.video("a");
    const b = await provider.video("b");
    const aggregate = aggregateVideoMetrics([a, b]);

    assert.equal(aggregate.sampleSize, 2);
    assert.ok(aggregate.averageViews > 0);
    assert.ok(aggregate.averageRetention > 0);
    assert.ok(aggregate.averageCtr > 0);
    assert.ok(aggregate.engagementRate >= 0);

    const ranked = rankVideosByViews([a, b]);
    assert.ok(ranked[0]!.views >= ranked[1]!.views);
  });
});
