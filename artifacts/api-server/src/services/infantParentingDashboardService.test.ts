import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildAlerts,
  computeRetentionCohorts,
  pctChange,
} from "./infantParentingDashboardMetrics.js";

describe("infantParentingDashboardMetrics", () => {
  it("pctChange handles zero baseline", () => {
    assert.equal(pctChange(10, 0), 100);
    assert.equal(pctChange(0, 0), 0);
    assert.equal(pctChange(8, 10), -20);
  });

  it("buildAlerts flags activation and cry drops", () => {
    const alerts = buildAlerts({
      activationRateCurrent: 40,
      activationRatePrevious: 60,
      cryUsageCurrent: 8,
      cryUsagePrevious: 12,
      notifOpenRateCurrent: 30,
      notifOpenRatePrevious: 50,
    });
    assert.ok(alerts.some((a) => a.code === "activation_rate_drop"));
    assert.ok(alerts.some((a) => a.code === "cry_insight_usage_drop"));
    assert.ok(alerts.some((a) => a.code === "notification_open_rate_drop"));
  });

  it("computeRetentionCohorts returns cohort retention percentages", () => {
    const start = new Date(Date.now() - 10 * 86400000);
    const d1 = new Date(start.getTime() + 86400000);
    const rows = [
      { userId: "u1", event: "infant_hub_opened", createdAt: start },
      { userId: "u1", event: "feed_logged", createdAt: d1 },
      { userId: "u2", event: "infant_hub_opened", createdAt: start },
    ];
    const result = computeRetentionCohorts(rows, 30);
    assert.equal(result.cohortSize, 2);
    assert.equal(result.d1, 50);
  });
});
