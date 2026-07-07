import assert from "node:assert/strict";
import { test } from "node:test";
import { assessConversionReadiness } from "./conversion-intelligence.js";
import { computeParentValueScore } from "../value/parent-value-score.js";
import { inferParentPersona } from "../persona/persona-engine.js";
import type { OutcomeSignals } from "../outcomes/types.js";

function signals(overrides: Partial<OutcomeSignals> = {}): OutcomeSignals {
  return {
    userId: "u1",
    childId: 1,
    childName: "Ava",
    accountAgeDays: 30,
    daysSinceLastActive: 0,
    isPremium: false,
    isFreeTier: true,
    routineCompletionRate7d: 0.6,
    routinesCompletedToday: 1,
    routinesMissedYesterday: false,
    weeklyRoutineConsistency: 0.6,
    lessonsCompletedTotal: 12,
    lessonsCompleted7d: 5,
    weakSubjects: [],
    strongSubjects: [],
    unfinishedLessonCount: 0,
    currentStreakDays: 6,
    streakBrokenDaysAgo: null,
    hadSevenDayStreak: false,
    firstRoutineCompleted: true,
    firstLearningCompleted: true,
    firstWeekComplete: true,
    firstMonthComplete: true,
    activationJourneyDay: null,
    activationJourneyActive: false,
    notificationsOpened7d: 4,
    sessionsLast7d: 6,
    childLifecycleStage: "ENGAGED",
    parentMilestones: [],
    churnRisk7d: 0.1,
    churnRisk30d: 0.1,
    churnRisk90d: 0.05,
    ...overrides,
  };
}

function readinessFor(stage: Parameters<typeof assessConversionReadiness>[0], s: OutcomeSignals) {
  return assessConversionReadiness(stage, s, computeParentValueScore(s), inferParentPersona(s));
}

test("never promotes to premium users (except expiring)", () => {
  const r = readinessFor("PREMIUM_SUBSCRIBER", signals({ isPremium: true }));
  assert.equal(r.promote, false);
  assert.equal(r.reason, "already_premium");
});

test("does not promote on non-monetization stage", () => {
  const r = readinessFor("ONBOARDING", signals());
  assert.equal(r.promote, false);
});

test("high value + trial ending recommends yearly and promotes", () => {
  const s = signals({
    subscription: { status: "trialing", trialDaysRemaining: 1 },
    currentStreakDays: 7,
    activity: { routinesCompleted7d: 7, lessonsCompleted7d: 10, worksheetsCompleted7d: 5, speechSessions7d: 4 },
  });
  const r = readinessFor("TRIAL_ENDING", s);
  assert.equal(r.promote, true);
  assert.equal(r.recommendedOffer, "yearly_discount");
  assert.ok(r.readiness >= 0.4);
});

test("high churn risk suppresses selling", () => {
  const s = signals({ churnRisk30d: 0.85, activity: { routinesCompleted7d: 2 } });
  const r = readinessFor("TRIAL_ENDING", s);
  assert.equal(r.promote, false);
});

test("expiring subscriber gets renewal offer", () => {
  const s = signals({ isPremium: true, subscription: { status: "canceled", subscriptionDaysRemaining: 2 } });
  const r = readinessFor("SUBSCRIPTION_EXPIRING", s);
  assert.equal(r.recommendedOffer, "renewal");
});
