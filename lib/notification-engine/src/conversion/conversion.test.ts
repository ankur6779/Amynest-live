import assert from "node:assert/strict";
import { test } from "node:test";
import { buildConversionLifecycleCopy } from "./conversion-lifecycle.js";
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
    strongSubjects: [],
    unfinishedLessonCount: 0,
    currentStreakDays: 5,
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

test("returns null for non-monetization stages", () => {
  assert.equal(buildConversionLifecycleCopy("ONBOARDING", signals()), null);
  assert.equal(buildConversionLifecycleCopy("DAILY_USER", signals()), null);
});

test("trial ending uses real days remaining and value proof", () => {
  const draft = buildConversionLifecycleCopy(
    "TRIAL_ENDING",
    signals({ subscription: { status: "trialing", trialDaysRemaining: 1 }, currentStreakDays: 5 }),
  );
  assert.ok(draft);
  assert.equal(draft!.goal, "GOAL_SUBSCRIPTION");
  assert.ok(draft!.body.includes("tomorrow"));
  assert.ok(draft!.body.includes("5-day streak"));
  assert.ok(draft!.personalizationUsed.includes("trialDaysRemaining"));
  assert.ok(draft!.trigger.startsWith("trial_ending"));
});

test("high purchase intent references last plan viewed", () => {
  const draft = buildConversionLifecycleCopy(
    "HIGH_PURCHASE_INTENT",
    signals({ subscription: { status: "free", paywallViewedDaysAgo: 1, lastPlanViewed: "yearly" } }),
  );
  assert.ok(draft);
  assert.ok(draft!.deepLink.includes("plan=yearly"));
  assert.equal(draft!.trigger, "paywall_viewed_no_purchase");
});

test("never fabricates a milestone when there is no genuine value", () => {
  const draft = buildConversionLifecycleCopy(
    "TRIAL_ENDING",
    signals({
      subscription: { status: "trialing", trialDaysRemaining: 2 },
      currentStreakDays: 0,
      lessonsCompleted7d: 0,
      lessonsCompletedTotal: 0,
      routineCompletionRate7d: 0,
    }),
  );
  assert.ok(draft);
  // No fabricated streak/lesson claim.
  assert.ok(!/\d+-day streak/.test(draft!.body));
  assert.ok(!/completed \d+ lessons/.test(draft!.body));
});

test("falls back to safe child name", () => {
  const draft = buildConversionLifecycleCopy(
    "SUBSCRIPTION_EXPIRING",
    signals({ childName: "   ", subscription: { status: "canceled", subscriptionDaysRemaining: 1 } }),
  );
  assert.ok(draft);
  assert.ok(draft!.title.includes("your child"));
});
