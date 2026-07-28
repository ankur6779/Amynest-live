import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Topic, TopicHistoryEntry } from "../types/index.js";
import { InMemoryHistoryStore } from "./history-store.js";
import {
  getEligibleTopics,
  prioritizeUnused,
  selectTopic,
  wasUsedWithinWindow,
} from "./rotation-engine.js";

function topic(
  id: string,
  overrides: Partial<Topic> = {},
): Topic {
  return {
    id,
    title: id,
    category: "Parenting",
    difficulty: "beginner",
    ageGroup: "all",
    keywords: ["parenting"],
    cta: "Try AmyNest",
    priority: 5,
    estimatedDuration: 45,
    videoStyle: "short",
    ...overrides,
  };
}

describe("rotation engine", () => {
  it("blocks topics used inside the 45-day window", () => {
    const topics = [topic("a"), topic("b")];
    const history: TopicHistoryEntry[] = [
      {
        topicId: "a",
        date: "2026-06-20",
        usedAt: "2026-06-20T03:30:00.000Z",
      },
    ];

    assert.equal(wasUsedWithinWindow("a", history, "2026-07-20", 45), true);
    assert.equal(wasUsedWithinWindow("a", history, "2026-08-05", 45), false);

    const eligible = getEligibleTopics(topics, history, "2026-07-20", {
      windowDays: 45,
    });
    assert.deepEqual(
      eligible.map((t) => t.id),
      ["b"],
    );
  });

  it("prioritizes unused topics before previously used ones", () => {
    const topics = [
      topic("used-old", { priority: 9 }),
      topic("unused-low", { priority: 3 }),
      topic("unused-high", { priority: 8 }),
    ];
    const history: TopicHistoryEntry[] = [
      {
        topicId: "used-old",
        date: "2026-01-01",
        usedAt: "2026-01-01T00:00:00.000Z",
      },
    ];

    const ordered = prioritizeUnused(topics, history).map((t) => t.id);
    assert.deepEqual(ordered, ["unused-high", "unused-low", "used-old"]);
  });

  it("selectTopic returns unused reason for never-used topics", () => {
    const store = new InMemoryHistoryStore();
    const result = selectTopic([topic("fresh")], store, "2026-07-27", {
      windowDays: 45,
    });
    assert.ok(result);
    assert.equal(result.topic.id, "fresh");
    assert.equal(result.reason, "unused");
    assert.equal(result.daysSinceLastUse, null);
  });

  it("respects preferred categories and exclude set", () => {
    const topics = [
      topic("p1", { category: "Parenting" }),
      topic("s1", { category: "Sleep" }),
      topic("p2", { category: "Parenting" }),
    ];
    const store = new InMemoryHistoryStore();
    const result = selectTopic(topics, store, "2026-07-27", {
      windowDays: 45,
      preferredCategories: ["Sleep"],
      excludeTopicIds: new Set(["s1"]),
    });
    assert.equal(result, null);
  });
});
