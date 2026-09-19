import assert from "node:assert/strict";
import { test } from "node:test";
import { mergeAlertWorkflows } from "../growth-operating-system/alerts/index.js";
import { mergeDecisionsFromRecommendations } from "../growth-operating-system/decision-center/index.js";
import {
  DEFAULT_GROWTH_OS_SETTINGS,
  type GrowthOsDecision,
  type GrowthOsPayload,
} from "../growth-operating-system/types.js";

function emptyPayload(): GrowthOsPayload {
  return {
    decisions: [],
    experiments: [],
    alertWorkflows: [],
    actionHistory: [],
    settings: { ...DEFAULT_GROWTH_OS_SETTINGS },
  };
}

test("mergeDecisionsFromRecommendations preserves approved admin status", () => {
  const approved: GrowthOsDecision = {
    id: "dec_rec_1",
    recommendationId: "rec_1",
    title: "Old title",
    description: "Old description",
    priority: "high",
    estimatedImpact: 80,
    confidence: 85,
    reason: "Old reason",
    affectedUsers: 0,
    expectedRevenueImpact: null,
    suggestedAction: "Old action",
    category: "retention",
    status: "approved",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-07T12:00:00.000Z",
    decidedBy: "admin_1",
    decidedAt: "2026-07-07T12:00:00.000Z",
    decisionReason: "Ship it",
  };

  const merged = mergeDecisionsFromRecommendations(
    { ...emptyPayload(), decisions: [approved] },
    [
      {
        id: "rec_1",
        title: "Fresh recommendation title",
        description: "Fresh recommendation copy",
        impactScore: 90,
        category: "retention",
      },
    ],
  );

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.status, "approved");
  assert.equal(merged[0]?.decidedBy, "admin_1");
  assert.equal(merged[0]?.decisionReason, "Ship it");
  assert.equal(merged[0]?.title, "Fresh recommendation title");
});

test("mergeAlertWorkflows preserves resolved workflow status and owner", () => {
  const payload = {
    ...emptyPayload(),
    alertWorkflows: [
      {
        id: "aw_alert_1",
        alertId: "alert_1",
        priority: "critical" as const,
        title: "Crash spike",
        description: "Crash rate above threshold",
        rootCause: "Bad release",
        suggestedFix: "Rollback",
        owner: "oncall",
        status: "resolved" as const,
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-07T11:00:00.000Z",
        history: [],
      },
    ],
  };

  const merged = mergeAlertWorkflows(payload, [
    {
      id: "alert_1",
      category: "critical",
      title: "Crash spike (refreshed)",
      message: "Crash rate above threshold",
    },
  ]);

  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.status, "resolved");
  assert.equal(merged[0]?.owner, "oncall");
  assert.equal(merged[0]?.rootCause, "Bad release");
  assert.equal(merged[0]?.title, "Crash spike (refreshed)");
});
