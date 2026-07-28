import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { loadDefaultConfig, loadResolvedBrainConfig } from "../config/index.js";
import { CAMPAIGN_PLAN_VERSION } from "../types/campaign-plan.js";
import { BrainOrchestrator } from "./orchestrator.js";
import { makeAnalyticsReport } from "./test-fixtures.js";
import { createDefaultTrendRegistry } from "./trends/index.js";

describe("BrainOrchestrator", () => {
  it("builds a CampaignPlan from AnalyticsReport", async () => {
    const analytics = await makeAnalyticsReport();
    const { plan, telemetry } = await new BrainOrchestrator({
      config: loadDefaultConfig(),
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    }).plan({
      analytics,
      startDate: "2026-07-28",
      horizonDays: 30,
      publishedTopicIds: ["parenting-001"],
    });

    assert.equal(plan.version, CAMPAIGN_PLAN_VERSION);
    assert.equal(plan.horizonDays, 30);
    assert.equal(plan.startDate, "2026-07-28");
    assert.equal(plan.endDate, "2026-08-26");
    assert.ok(plan.series.length >= 10);
    assert.ok(plan.schedule.length > 0);
    assert.ok(plan.priorityTopics.length > 0);
    assert.ok(plan.recommendedHooks.length > 0);
    assert.ok(plan.recommendedCtas.length > 0);
    assert.ok(plan.publishingCalendar.length > 0);
    assert.ok(plan.recommendations.length > 0);
    assert.ok(plan.experiments.length >= 7);
    assert.ok(plan.rankings.topics.length > 0);
    assert.ok(plan.rankings.categories.length > 0);
    assert.ok(plan.memory.publishedTopicIds.includes("parenting-001"));
    assert.ok(plan.expectedPerformance.confidence >= 0);
    assert.ok(plan.telemetry.planningDurationMs >= 0);
    assert.equal(plan.telemetry.provider, "mock");
    assert.equal(telemetry.name, "brain.plan");
  });

  it("exports campaign plans in json yaml and campaign-plan-v1", async () => {
    const analytics = await makeAnalyticsReport();
    const orchestrator = new BrainOrchestrator({
      config: loadResolvedBrainConfig(),
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    });
    const { plan } = await orchestrator.plan({
      analytics,
      startDate: "2026-07-28",
    });

    const json = orchestrator.export(plan, "json");
    const yaml = orchestrator.export(plan, "yaml");
    const manifest = orchestrator.export(plan, "campaign-plan-v1");
    assert.match(json.content, /"version": "9\.0\.0"/);
    assert.match(yaml.content, /version:/);
    assert.equal(JSON.parse(manifest.content).format, "campaign-plan-v1");
  });

  it("respects campaignPlanningEnabled false", async () => {
    const analytics = await makeAnalyticsReport();
    const { plan } = await new BrainOrchestrator({
      config: { ...loadDefaultConfig(), campaignPlanningEnabled: false },
      trendRegistry: createDefaultTrendRegistry(),
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    }).plan({ analytics, startDate: "2026-07-28" });

    assert.equal(plan.series.length, 0);
    assert.equal(plan.schedule.length, 0);
  });

  it("disables experiments when abTestingEnabled is false", async () => {
    const analytics = await makeAnalyticsReport();
    const { plan } = await new BrainOrchestrator({
      config: { ...loadDefaultConfig(), abTestingEnabled: false },
      now: () => new Date("2026-07-27T10:00:00.000Z"),
    }).plan({ analytics, startDate: "2026-07-28" });

    assert.equal(plan.experiments.length, 0);
    assert.equal(plan.experimentResults.length, 0);
  });
});
