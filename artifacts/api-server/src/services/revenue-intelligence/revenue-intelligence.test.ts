import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyEvidence, classifyEstimated, pctChange } from "./safety.js";
import { buildFounderFinanceBrief } from "./founder-finance-brief.js";
import { buildPricingExperimentAttribution } from "./experiment-attribution.js";

describe("revenue-intelligence safety", () => {
  it("classifies small samples as not_verified", () => {
    assert.equal(classifyEvidence({ measured: true, sampleSize: 1 }), "not_verified");
    assert.equal(classifyEstimated(5), "not_verified");
    assert.equal(classifyEstimated(15), "estimated");
    assert.equal(classifyEstimated(35), "measured");
  });

  it("computes pct change", () => {
    assert.equal(pctChange(110, 100), 10);
    assert.equal(pctChange(0, 0), 0);
  });
});

describe("founder finance brief", () => {
  it("flags zero paid with trials", () => {
    const brief = buildFounderFinanceBrief({
      dashboard: {
        subscriptions: { paidUsers: 0, trialUsers: 10, expiredUsers: 2, mrr: 0, arr: 0, conversionPct: 0, renewalPct: null, cancellationPct: null },
        kpis: { renewals: { value: 0 }, churn: { value: 0 } },
      } as never,
      financialKpis: [{ key: "mrr", label: "MRR", value: 0, previous: 0, changePct: null, unit: "inr", evidenceClass: "estimated", evidence: "", note: null }],
      funnel: [],
      featureAttribution: [],
      churn: { renewalRisk: [], subscribersAtRisk: [] },
      experiments: [],
    });
    assert.match(brief.revenueSummary, /0 paid/);
    assert.ok(brief.recommendedActions.some((a) => a.includes("trial")));
  });
});

describe("pricing experiment attribution", () => {
  it("marks insufficient experiments too_early", () => {
    const result = buildPricingExperimentAttribution([
      {
        id: "e1",
        name: "Test",
        featureFlag: "FF",
        controlUsers: 5,
        variantUsers: 8,
        primaryMetric: "routine",
        primaryMetricControl: 10,
        primaryMetricVariant: 15,
        secondaryMetrics: [],
        confidencePct: null,
        winningVariant: null,
        recommendedAction: "wait",
        insufficientSample: true,
        verified: true,
      },
    ]);
    assert.equal(result[0]?.decision, "too_early");
  });
});
