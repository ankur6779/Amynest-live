import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computePriorityScore, isMeaningfulChange, validateEvidence, actionAllowed } from "./safety.js";
import { decideExperiments } from "./experiment-decisions.js";
import { buildFounderActionQueue } from "./action-queue.js";
import type { ExperimentIntel } from "../growth-observatory/types.js";

describe("growth-os-v2 safety", () => {
  it("rejects noise below threshold", () => {
    assert.equal(isMeaningfulChange(5, 100), false);
    assert.equal(isMeaningfulChange(15, 10), false);
    assert.equal(isMeaningfulChange(15, 20), true);
  });

  it("blocks actions without evidence", () => {
    assert.equal(actionAllowed("not_enough_evidence"), false);
    assert.equal(actionAllowed("verified"), true);
    assert.equal(
      validateEvidence({ verified: true, users: 5, confidence: 90 }),
      "not_enough_evidence",
    );
  });
});

describe("priority scoring", () => {
  it("ranks higher impact above lower effort", () => {
    const high = computePriorityScore({
      businessImpact: 90,
      confidence: 85,
      effort: "S",
      revenueImpact: 80,
      retentionImpact: 70,
      activationImpact: 90,
      technicalRisk: 10,
      affectedUsers: 50,
    });
    const low = computePriorityScore({
      businessImpact: 40,
      confidence: 50,
      effort: "L",
      revenueImpact: 20,
      retentionImpact: 20,
      activationImpact: 30,
      technicalRisk: 10,
      affectedUsers: 10,
    });
    assert.ok(high > low);
  });
});

describe("experiment decisions", () => {
  it("marks insufficient sample as too_early", () => {
    const exp: ExperimentIntel = {
      id: "t",
      name: "Test",
      featureFlag: "FF",
      controlUsers: 10,
      variantUsers: 12,
      primaryMetric: "routine",
      primaryMetricControl: 5,
      primaryMetricVariant: 8,
      secondaryMetrics: [],
      confidencePct: null,
      winningVariant: null,
      recommendedAction: "wait",
      insufficientSample: true,
      verified: true,
    };
    const [decision] = decideExperiments([exp]);
    assert.equal(decision?.decision, "too_early");
  });
});

describe("founder action queue", () => {
  it("includes critical alerts first", () => {
    const queue = buildFounderActionQueue({
      changes: [],
      correlations: [],
      opportunities: [],
      regressions: [],
      experiments: [],
      alerts: [
        {
          id: "a1",
          category: "critical",
          metric: "signup_rate",
          title: "Signup drop",
          message: "Down 20%",
          changePct: -20,
          affectedUsers: 50,
          statisticallyMeaningful: true,
          evidence: "analytics_events",
        },
      ],
    });
    assert.equal(queue[0]?.sourceType, "alert");
    assert.equal(queue[0]?.priority, 1);
  });
});
