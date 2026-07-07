import assert from "node:assert/strict";
import { test } from "node:test";
import {
  detectLifecycleStage,
  strategyForLifecycleStage,
  isInactiveStage,
  isMonetizationStage,
} from "./lifecycle-stage.js";
import type { OutcomeSignals } from "../outcomes/types.js";

function signals(overrides: Partial<OutcomeSignals> = {}): OutcomeSignals {
  return {
    userId: "u1",
    childId: 1,
    childName: "Ava",
    accountAgeDays: 20,
    daysSinceLastActive: 0,
    isPremium: false,
    isFreeTier: true,
    routineCompletionRate7d: 0.6,
    routinesCompletedToday: 1,
    routinesMissedYesterday: false,
    weeklyRoutineConsistency: 0.6,
    lessonsCompletedTotal: 12,
    lessonsCompleted7d: 4,
    weakSubjects: [],
    strongSubjects: ["math"],
    unfinishedLessonCount: 0,
    currentStreakDays: 4,
    streakBrokenDaysAgo: null,
    hadSevenDayStreak: false,
    firstRoutineCompleted: true,
    firstLearningCompleted: true,
    firstWeekComplete: true,
    firstMonthComplete: false,
    activationJourneyDay: null,
    activationJourneyActive: false,
    notificationsOpened7d: 3,
    sessionsLast7d: 5,
    childLifecycleStage: "ENGAGED",
    parentMilestones: [],
    churnRisk7d: 0.1,
    churnRisk30d: 0.1,
    churnRisk90d: 0.05,
    ...overrides,
  };
}

test("deep inactivity outranks everything, even premium", () => {
  assert.equal(
    detectLifecycleStage(signals({ daysSinceLastActive: 15, isPremium: true })),
    "INACTIVE_14D",
  );
  assert.equal(detectLifecycleStage(signals({ daysSinceLastActive: 8 })), "INACTIVE_7D");
  assert.equal(detectLifecycleStage(signals({ daysSinceLastActive: 4 })), "INACTIVE_3D");
});

test("trial ending fires within threshold, trial user otherwise", () => {
  const ending = detectLifecycleStage(
    signals({ subscription: { status: "trialing", trialDaysRemaining: 1 } }),
  );
  assert.equal(ending, "TRIAL_ENDING");

  const active = detectLifecycleStage(
    signals({ subscription: { status: "trialing", trialDaysRemaining: 6 } }),
  );
  assert.equal(active, "TRIAL_USER");
});

test("high purchase intent from recent unconverted paywall view", () => {
  const stage = detectLifecycleStage(
    signals({ subscription: { status: "free", paywallViewedDaysAgo: 1, paywallViewCount: 2 } }),
  );
  assert.equal(stage, "HIGH_PURCHASE_INTENT");
});

test("subscription expiring when canceled and lapse imminent", () => {
  const stage = detectLifecycleStage(
    signals({ subscription: { status: "canceled", subscriptionDaysRemaining: 2 } }),
  );
  assert.equal(stage, "SUBSCRIPTION_EXPIRING");
});

test("active subscriber is premium subscriber", () => {
  const stage = detectLifecycleStage(
    signals({ subscription: { status: "active", subscriptionDaysRemaining: 300 } }),
  );
  assert.equal(stage, "PREMIUM_SUBSCRIBER");
});

test("new install detected on day 0 with no activation", () => {
  const stage = detectLifecycleStage(
    signals({
      accountAgeDays: 0,
      firstRoutineCompleted: false,
      firstLearningCompleted: false,
      lessonsCompletedTotal: 0,
      lessonsCompleted7d: 0,
      currentStreakDays: 0,
      routineCompletionRate7d: 0,
      sessionsLast7d: 1,
    }),
  );
  assert.equal(stage, "NEW_INSTALL");
});

test("power user requires high activity and a streak", () => {
  const stage = detectLifecycleStage(
    signals({ currentStreakDays: 10, lessonsCompleted7d: 6, routineCompletionRate7d: 0.9, sessionsLast7d: 7 }),
  );
  assert.equal(stage, "POWER_USER");
});

test("backward compat: isPremium without subscription object maps to premium", () => {
  const stage = detectLifecycleStage(signals({ isPremium: true, subscription: undefined }));
  assert.equal(stage, "PREMIUM_SUBSCRIBER");
});

test("strategy blocks monetization for onboarding and premium, allows for trial ending", () => {
  assert.equal(strategyForLifecycleStage("ONBOARDING").monetizationAllowed, false);
  assert.equal(strategyForLifecycleStage("PREMIUM_SUBSCRIBER").monetizationAllowed, false);
  assert.equal(strategyForLifecycleStage("TRIAL_ENDING").monetizationAllowed, true);
  assert.equal(isMonetizationStage("HIGH_PURCHASE_INTENT"), true);
});

test("inactive stage helper", () => {
  assert.equal(isInactiveStage("INACTIVE_7D"), true);
  assert.equal(isInactiveStage("POWER_USER"), false);
});
