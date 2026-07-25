import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
  buildBirthSkyRouterAnalytics,
  estimateBirthSkyCostUsd,
  recordBirthSkyAiTelemetry,
  resetBirthSkyRouterTelemetryForTests,
} from "./ai-router-telemetry.js";

describe("ai-router-telemetry", () => {
  beforeEach(() => {
    resetBirthSkyRouterTelemetryForTests();
  });

  it("estimates cost from tier prices", () => {
    const fast = estimateBirthSkyCostUsd({
      tier: "fast",
      inputTokens: 3000,
      outputTokens: 370,
    });
    const reasoning = estimateBirthSkyCostUsd({
      tier: "reasoning",
      inputTokens: 3000,
      outputTokens: 370,
    });
    assert.ok(reasoning > fast);
  });

  it("aggregates usage and recommendations", () => {
    for (let i = 0; i < 70; i++) {
      recordBirthSkyAiTelemetry({
        conversationId: `c-fast-${i % 5}`,
        selectedModel: "gpt-5-mini",
        tier: "fast",
        routingReason: i % 3 === 0 ? "quick_followup" : "simple",
        latencyMs: 800,
        inputTokens: 2800,
        outputTokens: 320,
        estimatedCostUsd: 0.001,
        conversationLength: 2,
        escalated: false,
        downgraded: false,
        confidence: 0.9,
        status: "ok",
      });
    }
    for (let i = 0; i < 30; i++) {
      recordBirthSkyAiTelemetry({
        conversationId: `c-reason-${i % 3}`,
        selectedModel: "gpt-5",
        tier: "reasoning",
        routingReason: i % 2 === 0 ? "reflection" : "score:emotional",
        latencyMs: 1800,
        inputTokens: 3200,
        outputTokens: 400,
        estimatedCostUsd: 0.008,
        conversationLength: 6,
        escalated: true,
        downgraded: false,
        confidence: 0.85,
        status: "ok",
      });
    }

    const report = buildBirthSkyRouterAnalytics();
    assert.equal(report.sampleSize, 100);
    assert.ok(report.modelUsagePct.fast >= 0.6 && report.modelUsagePct.fast <= 0.75);
    assert.ok(report.modelUsagePct.reasoning >= 0.25 && report.modelUsagePct.reasoning <= 0.4);
    assert.ok(report.recommendations.length >= 2);
    assert.ok(report.mostExpensiveConversations.length > 0);
  });
});
