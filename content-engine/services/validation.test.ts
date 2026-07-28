import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getDefaultWeekCalendar } from "../calendar/index.js";
import { loadDefaultConfig } from "../config/index.js";
import { TOPIC_COUNT, getAllTopics } from "../topics/index.js";
import { TOPIC_CATEGORIES, type Topic } from "../types/index.js";
import {
  validateConfig,
  validateTopic,
  validateTopics,
  validateWeekCalendar,
} from "./validation.js";

describe("validation", () => {
  it("accepts the default config", () => {
    const result = validateConfig(loadDefaultConfig());
    assert.equal(result.ok, true, result.issues.map((i) => i.message).join("; "));
  });

  it("rejects invalid uploadTime and empty preferredCategories", () => {
    const config = loadDefaultConfig();
    config.uploadTime = "25:99";
    config.preferredCategories = [];
    const result = validateConfig(config);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.path === "uploadTime"));
    assert.ok(result.issues.some((i) => i.path === "preferredCategories"));
  });

  it("rejects invalid Phase 5 render settings", () => {
    const config = loadDefaultConfig();
    // @ts-expect-error intentional invalid renderer for validation coverage
    config.renderer = "unknown";
    // @ts-expect-error intentional invalid codec for validation coverage
    config.codec = "av1";
    const result = validateConfig(config);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.path === "renderer"));
    assert.ok(result.issues.some((i) => i.path === "codec"));
  });

  it("rejects invalid Phase 9 brain settings", () => {
    const config = loadDefaultConfig();
    // @ts-expect-error intentional invalid trend provider
    config.trendProvider = "unknown-trends";
    config.confidenceThreshold = 2;
    config.learningWindowDays = 0;
    const result = validateConfig(config);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.path === "trendProvider"));
    assert.ok(result.issues.some((i) => i.path === "confidenceThreshold"));
    assert.ok(result.issues.some((i) => i.path === "learningWindowDays"));
  });

  it("rejects invalid Phase 10 operations settings", () => {
    const config = loadDefaultConfig();
    // @ts-expect-error intentional invalid environment
    config.runtimeEnvironment = "qa";
    // @ts-expect-error intentional invalid scheduler
    config.schedulerBackend = "kubernetes";
    config.dailyCron = "invalid";
    config.maximumMemoryUsagePercent = 200;
    const result = validateConfig(config);
    assert.equal(result.ok, false);
    assert.ok(result.issues.some((i) => i.path === "runtimeEnvironment"));
    assert.ok(result.issues.some((i) => i.path === "schedulerBackend"));
    assert.ok(result.issues.some((i) => i.path === "dailyCron"));
    assert.ok(result.issues.some((i) => i.path === "maximumMemoryUsagePercent"));
  });

  it("validates the topic database shape and coverage", () => {
    assert.ok(TOPIC_COUNT >= 150);
    const result = validateTopics(getAllTopics());
    assert.equal(result.ok, true, result.issues.map((i) => i.message).join("; "));
    for (const category of TOPIC_CATEGORIES) {
      assert.ok(
        getAllTopics().some((t) => t.category === category),
        `missing ${category}`,
      );
    }
  });

  it("flags malformed topics", () => {
    const bad: Topic = {
      id: "",
      title: "",
      category: "Parenting",
      difficulty: "beginner",
      ageGroup: "all",
      keywords: [],
      cta: "",
      priority: 99,
      estimatedDuration: 0,
      videoStyle: "short",
    };
    const issues = validateTopic(bad);
    assert.ok(issues.length >= 5);
  });

  it("validates the default week calendar slots", () => {
    const result = validateWeekCalendar(getDefaultWeekCalendar());
    assert.equal(result.ok, true, result.issues.map((i) => i.message).join("; "));
    assert.equal(getDefaultWeekCalendar().monday.length, 3);
  });
});
