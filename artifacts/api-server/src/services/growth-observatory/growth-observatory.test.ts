import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFunnelIntelStages } from "./funnel-intelligence.js";
import { findLargestRegression } from "./daily-brief.js";
import { generateObservatoryAlerts } from "./alerts.js";
import type { FunnelStageCounts } from "./funnel-intelligence.js";

function stage(key: string, current: number, previous = 0, day7 = current): FunnelStageCounts {
  return {
    key,
    label: key,
    users: { current, previous, day1: current, day7, day30: current },
    available: true,
  };
}

describe("buildFunnelIntelStages", () => {
  it("computes drop and conversion between stages", () => {
    const counts = [stage("install", 100), stage("signup", 40), stage("dashboard", 20)];
    const result = buildFunnelIntelStages(counts);
    assert.equal(result[1]?.dropPct, 60);
    assert.equal(result[1]?.conversionPct, 40);
    assert.equal(result[2]?.dropPct, 50);
  });
});

describe("findLargestRegression", () => {
  it("prefers worst 7d trend under -10%", () => {
    const stages = buildFunnelIntelStages([
      stage("install", 100),
      { ...stage("signup", 50), users: { current: 50, previous: 0, day1: 50, day7: 80, day30: 50 } },
    ]);
    const worst = findLargestRegression(stages);
    assert.equal(worst?.key, "signup");
  });
});

describe("generateObservatoryAlerts", () => {
  it("fires signup drop when 7d trend is meaningful", () => {
    const funnel = buildFunnelIntelStages([
      stage("install", 100),
      { ...stage("signup", 20), users: { current: 20, previous: 0, day1: 20, day7: 40, day30: 20 } },
    ]);
    const alerts = generateObservatoryAlerts({
      funnel,
      dashboard: {
        retention: { summary: { d1: 10, d3: 5, d7: 3, d14: 2, d30: 1 } },
        kpis: {
          dau: { value: 50, previous: 45, changePct: 10 },
          trialsStarted: { value: 5, previous: 4, changePct: 25 },
          crashFreePct: { value: 99, previous: 99, changePct: 0 },
          appOpens: { value: 100, previous: 90, changePct: 11 },
        },
        performance: { crashFreePct: 99, networkErrors: 0, crashCount: 0, apiLatencyMs: 100 },
      } as never,
      startupFailureRate: 1,
      purchaseFailureRate: 5,
    });
    assert.ok(alerts.some((a) => a.id === "alert_signup_drop"));
  });
});
