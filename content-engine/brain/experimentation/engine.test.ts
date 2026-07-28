import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { makeAnalyticsReport } from "../test-fixtures.js";
import { buildOptimizationDecision } from "../optimizer/index.js";
import { buildContentMemory } from "../memory/index.js";
import { rankCategories, rankTopics } from "../ranking/index.js";
import { collectExperimentResults, planExperiments } from "./engine.js";

describe("A/B experiment engine", () => {
  it("plans experiments for all supported variables", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({
      analytics,
      learningWindowDays: 60,
      now: new Date("2026-07-27T10:00:00.000Z"),
    });
    const optimization = buildOptimizationDecision({
      analytics,
      memory,
      rankedTopics: rankTopics({
        analytics,
        memory,
        confidenceThreshold: 0.55,
      }),
      rankedCategories: rankCategories(analytics),
      enabled: true,
    });

    const experiments = planExperiments({
      analytics,
      optimization,
      enabled: true,
      now: new Date("2026-07-27T10:00:00.000Z"),
    });

    const variables = new Set(experiments.map((e) => e.variable));
    for (const variable of [
      "title",
      "hook",
      "description",
      "cta",
      "length",
      "publish-time",
      "hashtags",
    ] as const) {
      assert.ok(variables.has(variable), `missing ${variable}`);
    }
    assert.equal(experiments.length, 7);

    const results = collectExperimentResults(experiments, analytics, optimization);
    assert.ok(results.length >= 0);
    for (const result of results) {
      assert.ok(result.winnerVariantId);
      assert.ok(result.confidence >= 0);
      assert.ok(result.lift >= 0);
    }
  });

  it("returns no experiments when disabled", async () => {
    const analytics = await makeAnalyticsReport();
    const memory = buildContentMemory({ analytics, learningWindowDays: 60 });
    const optimization = buildOptimizationDecision({
      analytics,
      memory,
      rankedTopics: [],
      rankedCategories: [],
      enabled: true,
    });
    assert.deepEqual(
      planExperiments({ analytics, optimization, enabled: false }),
      [],
    );
  });
});
