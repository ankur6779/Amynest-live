import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  inferBehavioralPremiumTrigger,
  resolveAudienceSegment,
  pickEligibleJourneyStep,
  evaluateSegmentCap,
  isMonetizationAllowedForSegment,
} from "./index.js";
import type { OutcomeSignals } from "../outcomes/types.js";

function baseSignals(overrides: Partial<OutcomeSignals> = {}): OutcomeSignals {
  return {
    userId: "u1",
    childId: 1,
    childName: "Maya",
    accountAgeDays: 10,
    daysSinceLastActive: 0,
    isPremium: false,
    isFreeTier: true,
    routineCompletionRate7d: 0.5,
    routinesCompletedToday: 1,
    routinesMissedYesterday: false,
    weeklyRoutineConsistency: 0.5,
    lessonsCompletedTotal: 2,
    lessonsCompleted7d: 1,
    weakSubjects: [],
    strongSubjects: [],
    unfinishedLessonCount: 0,
    currentStreakDays: 3,
    streakBrokenDaysAgo: null,
    hadSevenDayStreak: false,
    firstRoutineCompleted: true,
    firstLearningCompleted: false,
    firstWeekComplete: false,
    firstMonthComplete: false,
    activationJourneyDay: null,
    activationJourneyActive: false,
    notificationsOpened7d: 1,
    sessionsLast7d: 4,
    childLifecycleStage: "ACTIVE",
    parentMilestones: [],
    churnRisk7d: 0.1,
    churnRisk30d: 0.1,
    churnRisk90d: 0.1,
    ...overrides,
  };
}

describe("segment resolver", () => {
  it("resolves INACTIVE_USERS when inactive >= 3 days", () => {
    const r = resolveAudienceSegment(baseSignals({ daysSinceLastActive: 5 }));
    assert.equal(r.segment, "INACTIVE_USERS");
  });

  it("resolves REGISTERED_NO_ROUTINE for onboarding users", () => {
    const r = resolveAudienceSegment(
      baseSignals({
        firstRoutineCompleted: false,
        accountAgeDays: 2,
      }),
    );
    assert.equal(r.segment, "REGISTERED_NO_ROUTINE");
  });

  it("resolves EXPIRED_PREMIUM from subscription signals", () => {
    const r = resolveAudienceSegment(
      baseSignals({
        isPremium: false,
        subscription: { status: "expired", everSubscribed: true },
      }),
    );
    assert.equal(r.segment, "EXPIRED_PREMIUM");
  });

  it("resolves FREE_BEHAVIORAL on routine limit trigger", () => {
    const trigger = inferBehavioralPremiumTrigger(
      baseSignals({ activity: { routinesCompleted7d: 4 } }),
    );
    assert.equal(trigger, "routine_limit");
    const r = resolveAudienceSegment(
      baseSignals({ activity: { routinesCompleted7d: 4 } }),
    );
    assert.equal(r.segment, "FREE_BEHAVIORAL");
  });

  it("resolves PREMIUM_USERS for active subscribers", () => {
    const r = resolveAudienceSegment(baseSignals({ isPremium: true }));
    assert.equal(r.segment, "PREMIUM_USERS");
  });

  it("blocks monetization for premium segment", () => {
    assert.equal(
      isMonetizationAllowedForSegment("PREMIUM_USERS", "conversion"),
      false,
    );
  });

  it("enforces 2/day segment cap", () => {
    const blocked = evaluateSegmentCap({
      segment: "INACTIVE_USERS",
      crmNonCriticalSentToday: 2,
    });
    assert.equal(blocked.allowed, false);
  });

  it("picks no-routine step at 24h", () => {
    const picked = pickEligibleJourneyStep(
      "REGISTERED_NO_ROUTINE",
      25,
      baseSignals({ firstRoutineCompleted: false }),
    );
    assert.ok(picked);
    assert.equal(picked!.step.stepId, "h24");
  });
});
