import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeNotificationIntelligence,
  type NotificationIntelligenceRecord,
} from "./notification-intelligence-dashboard.js";

test("aggregates core KPIs and distributions", () => {
  const records: NotificationIntelligenceRecord[] = [
    { status: "sent", delivered: true, opened: true, clicked: true, converted: true, revenue: 999, lifecycleStage: "TRIAL_ENDING", persona: "LEARNING_PARENT", qualityScore: 80, decisionExpectedValue: 0.7, decisionAccepted: true },
    { status: "sent", delivered: true, opened: false, dismissed: true, lifecycleStage: "DAILY_USER", persona: "ROUTINE_PARENT", qualityScore: 60, decisionExpectedValue: 0.5, decisionAccepted: true },
    { status: "suppressed", suppressionReason: "fatigue_high", decisionAccepted: false, decisionExpectedValue: 0.1 },
    { status: "sent", delivered: true, opened: false, lifecycleStage: "DAILY_USER", persona: "ROUTINE_PARENT", qualityScore: 70, permissionLostAfter: true },
  ];

  const d = computeNotificationIntelligence(records);
  assert.equal(d.sent, 3);
  assert.equal(d.suppressed, 1);
  assert.equal(d.opened, 1);
  assert.equal(d.conversions, 1);
  assert.equal(d.subscriptionRevenue, 999);
  assert.equal(d.permissionLoss, 1);
  assert.equal(d.ignored, 1);
  assert.equal(d.suppressionBreakdown["fatigue_high"], 1);
  assert.equal(d.personaDistribution["ROUTINE_PARENT"], 2);
  assert.ok(d.avgQualityScore > 0);
  assert.ok(d.openRate > 0 && d.openRate <= 1);
});

test("empty input yields zeroed metrics without dividing by zero", () => {
  const d = computeNotificationIntelligence([]);
  assert.equal(d.sent, 0);
  assert.equal(d.openRate, 0);
  assert.equal(d.revenuePerNotification, 0);
  assert.equal(d.decisionAcceptanceRate, 0);
});

test("decision acceptance rate reflects accepted vs evaluated", () => {
  const d = computeNotificationIntelligence([
    { status: "sent", decisionAccepted: true },
    { status: "suppressed", decisionAccepted: false },
  ]);
  assert.equal(d.decisionAcceptanceRate, 0.5);
});
