import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAnalyticsReport } from "../test-fixtures.js";
import { buildContentMemory } from "./engine.js";

describe("content memory", () => {
  it("remembers published topics winning hooks ctas times and styles", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({
      analytics,
      publishedTopicIds: ["parenting-001", "speech-001"],
      learningWindowDays: 60,
      now: new Date("2026-07-27T10:00:00.000Z"),
    });

    assert.ok(memory.publishedTopicIds.includes("parenting-001"));
    assert.ok(Array.isArray(memory.winningHooks));
    assert.ok(Array.isArray(memory.winningCtas));
    assert.ok(Array.isArray(memory.winningPublishHours));
    assert.ok(Array.isArray(memory.winningVideoStyles));
    assert.ok(Array.isArray(memory.avoidedTopicIds));
    assert.ok(memory.updatedAt);
  });

  it("avoids weak and declining topics in avoidedTopicIds", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({
      analytics,
      learningWindowDays: 60,
    });
    for (const id of analytics.trends.decliningTopics.map((t) => t.topicId)) {
      assert.ok(memory.avoidedTopicIds.includes(id));
    }
  });
});
