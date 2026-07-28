import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeContentPackage } from "../test-fixtures.js";
import { MockAnalyticsProvider } from "../providers/mock.js";
import { scoreContent, scoreTopic } from "./engine.js";

describe("analytics scoring", () => {
  it("scores topics 0–100 across performance dimensions", async () => {
    const metrics = [
      await new MockAnalyticsProvider().video("t1"),
      await new MockAnalyticsProvider().video("t2"),
    ];
    const score = scoreTopic({
      topicId: "parenting-001",
      topicTitle: "Gentle Discipline",
      category: "Parenting",
      metrics,
    });

    assert.ok(score.score.overall >= 0 && score.score.overall <= 100);
    assert.ok(score.score.performance >= 0);
    assert.ok(score.score.retention >= 0);
    assert.ok(score.score.engagement >= 0);
    assert.ok(score.score.growth >= 0);
    assert.ok(score.score.freshness >= 0);
    assert.equal(score.sampleSize, 2);
  });

  it("scores hooks cta titles descriptions hashtags length and pace", async () => {
    const metrics = await new MockAnalyticsProvider().video("c1");
    const score = scoreContent({
      videoId: "c1",
      topicId: "parenting-001",
      content: makeContentPackage(),
      metrics,
      durationSeconds: 30,
      sceneCount: 4,
    });

    assert.ok(score.score.hooks > 0);
    assert.ok(score.score.cta > 0);
    assert.ok(score.score.titles > 0);
    assert.ok(score.score.descriptions > 0);
    assert.ok(score.score.hashtags > 0);
    assert.ok(score.score.videoLength > 0);
    assert.ok(score.score.scenePace > 0);
    assert.ok(score.score.overall <= 100);
  });
});
