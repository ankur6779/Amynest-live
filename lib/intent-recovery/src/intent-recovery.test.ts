import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  canTransitionIntent,
  transitionOnInterruption,
  buildContinueJourneyView,
  deriveIntentsFromContext,
  smartReminderBody,
  computeIntentRoi,
} from "./index.js";
import type { UserIntent } from "./types.js";

function mockIntent(overrides: Partial<UserIntent> = {}): UserIntent {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 86_400_000).toISOString();
  return {
    intentId: "intent_test",
    userId: "u1",
    childId: 1,
    intentType: "CONTINUE_CAMPAIGN",
    intentSource: "campaign",
    intentPriority: 85,
    state: "pending",
    title: "Day 4: Retell",
    subtitle: "Reading challenge",
    amyContinuationLine: "You were halfway through the Reading Challenge.",
    actionTarget: "story_time",
    entityId: "reading_7d",
    href: "/parenting-hub#tile-story-hub",
    progressPct: 50,
    progressJson: {},
    deviceId: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    interruptedAt: null,
    completedAt: null,
    expiresAt: expires,
    ...overrides,
  };
}

describe("intent-recovery", () => {
  test("state machine allows valid transitions", () => {
    assert.equal(canTransitionIntent("pending", "started"), true);
    assert.equal(canTransitionIntent("in_progress", "completed"), true);
    assert.equal(canTransitionIntent("completed", "pending"), false);
  });

  test("interruption returns to pending", () => {
    assert.equal(transitionOnInterruption("in_progress"), "pending");
    assert.equal(transitionOnInterruption("completed"), "completed");
  });

  test("resume engine ranks by priority", () => {
    const view = buildContinueJourneyView([
      mockIntent({ intentPriority: 60, intentId: "low" }),
      mockIntent({ intentPriority: 90, intentId: "high", title: "Routine task" }),
    ]);
    assert.equal(view.topIntent?.intentId, "high");
    assert.equal(view.hasUnfinished, true);
  });

  test("derive campaign intent from context", () => {
    const derived = deriveIntentsFromContext({
      userId: "u1",
      childId: 1,
      childName: "Ava",
      campaign: {
        campaignId: "reading_7d",
        currentStep: 4,
        stepCompletedAt: { "1": "2026-05-26", "2": "2026-05-27", "3": "2026-05-28" },
        startedAt: new Date("2026-05-25"),
      },
      learningSession: null,
      routineTask: null,
      activeGoal: null,
    });
    assert.ok(derived.length >= 1);
    assert.equal(derived[0]?.intentType, "START_READING_CHALLENGE");
  });

  test("smart reminder uses intent-specific copy", () => {
    const body = smartReminderBody(mockIntent({ intentType: "START_READING_CHALLENGE" }));
    assert.ok(body.includes("reading challenge"));
  });

  test("intent ROI computes completion rate", () => {
    const roi = computeIntentRoi([
      mockIntent({ state: "completed", completedAt: new Date().toISOString() }),
      mockIntent({ state: "abandoned", intentId: "i2" }),
    ]);
    assert.equal(roi[0]?.created, 2);
    assert.equal(roi[0]?.completed, 1);
    assert.equal(roi[0]?.completionRate, 50);
  });
});
