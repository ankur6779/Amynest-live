import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  emitAdminAlert,
  emitAdminResolution,
  getAdminAlerts,
  isAdminAlertConditionActive,
  resetAdminAlertSystemForTests,
  syncAdminAlertCondition,
} from "../admin-alert-system.js";

describe("admin alert system", () => {
  beforeEach(() => {
    resetAdminAlertSystemForTests();
  });

  it("stores INFO alerts on dashboard only", async () => {
    const result = await emitAdminAlert({
      severity: "info",
      module: "predictive",
      issue: "api degrading",
      metric: "apiErrorRate",
      value: 4.2,
    });

    assert.equal(result.reason, "dashboard_only");
    assert.deepEqual(result.channels, ["dashboard"]);
    assert.equal(getAdminAlerts().length, 1);
    assert.equal(getAdminAlerts()[0]!.severity, "info");
  });

  it("deduplicates same alert within 5 minutes", async () => {
    const payload = {
      severity: "critical" as const,
      module: "lesson" as const,
      issue: "Audio failure spike",
      metric: "failureRate",
      value: 7.2,
      actionTaken: "safe_mode_enabled",
    };

    const first = await emitAdminAlert(payload, 1_000);
    const second = await emitAdminAlert(payload, 60_000);

    assert.equal(first.dispatched, true);
    assert.equal(second.dispatched, false);
    assert.equal(second.reason, "dedup");
  });

  it("enforces 2-minute global cooldown between external alerts", async () => {
    const critical = {
      severity: "critical" as const,
      module: "api" as const,
      issue: "API down",
      metric: "serviceStatus",
      value: 0,
    };
    const warning = {
      severity: "warning" as const,
      module: "streaming" as const,
      issue: "Streaming unstable",
      metric: "streamingStallRate",
      value: 12,
    };

    const first = await emitAdminAlert(critical, 0);
    const second = await emitAdminAlert(warning, 30_000);

    assert.equal(first.dispatched, true);
    assert.equal(second.dispatched, false);
    assert.equal(second.reason, "cooldown");
  });

  it("syncs condition rising and falling edges", async () => {
    const payload = {
      severity: "critical" as const,
      module: "system" as const,
      issue: "Safe mode activated",
      metric: "failureRate",
      value: 8,
      actionTaken: "safe_mode_enabled",
    };

    await syncAdminAlertCondition(true, payload, undefined, 0);
    assert.equal(isAdminAlertConditionActive(payload), true);
    assert.equal(getAdminAlerts().length, 1);

    await syncAdminAlertCondition(true, payload, undefined, 130_000);
    assert.equal(getAdminAlerts().length, 1);

    const resolved = await emitAdminResolution(payload, undefined, 130_000);
    assert.equal(resolved, true);
    assert.equal(isAdminAlertConditionActive(payload), false);

    const latest = getAdminAlerts()[0]!;
    assert.equal(latest.resolved, true);
    assert.match(latest.resolutionMessage ?? "", /Safe mode activated resolved/);
  });

  it("does not emit resolution for inactive conditions", async () => {
    const resolved = await emitAdminResolution({
      severity: "critical",
      module: "api",
      issue: "API down",
      metric: "serviceStatus",
    });
    assert.equal(resolved, false);
  });
});
