import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  scoreBusinessImpact,
  detectChildLifecycleStage,
  predictChurn,
  resolveOutcomeStrategy,
  getStreakRecoveryNotification,
  buildLearningOutcomeCopy,
  buildRoutineOutcomeCopy,
  shouldTriggerConversionJourney,
  attributeOutcome,
  computeOutcomeAnalytics,
  computeExecutiveDashboard,
  assignExperimentVariant,
  coachifyCopy,
  goalForCategory,
} from "./index.js";
import type { OutcomeSignals, OutcomeContext } from "./types.js";
import type { ContentContext } from "../types.js";

function baseSignals(overrides: Partial<OutcomeSignals> = {}): OutcomeSignals {
  return {
    userId: "u1",
    childId: 1,
    childName: "Ava",
    accountAgeDays: 14,
    daysSinceLastActive: 1,
    isPremium: false,
    isFreeTier: true,
    routineCompletionRate7d: 0.5,
    routinesCompletedToday: 0,
    routinesMissedYesterday: false,
    weeklyRoutineConsistency: 0.5,
    lessonsCompletedTotal: 5,
    lessonsCompleted7d: 2,
    weakSubjects: ["english"],
    strongSubjects: [],
    unfinishedLessonCount: 1,
    currentStreakDays: 3,
    streakBrokenDaysAgo: null,
    hadSevenDayStreak: false,
    firstRoutineCompleted: true,
    firstLearningCompleted: true,
    firstWeekComplete: true,
    firstMonthComplete: false,
    activationJourneyDay: 3,
    activationJourneyActive: true,
    notificationsOpened7d: 2,
    sessionsLast7d: 5,
    childLifecycleStage: "ACTIVE",
    parentMilestones: [],
    churnRisk7d: 0.1,
    churnRisk30d: 0.1,
    churnRisk90d: 0.05,
    ...overrides,
  };
}

function minimalCtx(category = "learning_activity"): ContentContext {
  return {
    userId: "u1",
    childId: 1,
    childName: "Ava",
    age: 6,
    ageMonths: 72,
    ageGroup: "child",
    foodType: "veg",
    timezone: "America/New_York",
    localDate: "2026-05-29",
    timeOfDay: "morning",
    isWeekend: false,
    isSchoolDay: true,
    season: "summer",
    engagementScore: 55,
    category: category as ContentContext["category"],
    locale: "en-US",
    countryCode: "US",
    culturalRegion: "north_america",
    calendar: {
      holidayId: null,
      holidayName: null,
      isRamadanSeason: false,
      isSummerBreak: true,
      isExamSeason: false,
      isBackToSchool: false,
      schoolTerm: "term",
    },
    rtl: false,
  };
}

function minimalOutcome(signals: OutcomeSignals): OutcomeContext {
  return {
    signals,
    goal: "GOAL_LEARNING_COMPLETION",
    childLifecycleStage: signals.childLifecycleStage,
    parentMilestone: null,
    campaignId: null,
    campaignStep: null,
    experimentId: "coach_copy_v1",
    experimentVariant: "coach",
  };
}

test("business impact score prioritizes learning outcomes for weak subjects", () => {
  const signals = baseSignals({ weakSubjects: ["math"], unfinishedLessonCount: 2 });
  signals.childLifecycleStage = detectChildLifecycleStage(signals);
  const outcome = minimalOutcome(signals);
  outcome.goal = "GOAL_LEARNING_COMPLETION";

  const impact = scoreBusinessImpact(
    minimalCtx("learning_activity"),
    { title: "Learn", body: "Practice math", topicKey: "math", contentType: "educational" },
    outcome,
    [],
  );
  assert.ok(impact.composite >= 42);
  assert.ok(impact.learningCompletionProb > impact.subscriptionProb);
});

test("child lifecycle detects AT_RISK from inactivity", () => {
  const stage = detectChildLifecycleStage(baseSignals({ daysSinceLastActive: 5, sessionsLast7d: 0 }));
  assert.equal(stage, "AT_RISK");
});

test("churn prediction increases for inactive users", () => {
  const p = predictChurn(baseSignals({ daysSinceLastActive: 8 }));
  assert.ok(p.churnRisk7d > 0.8);
  assert.equal(p.interventionLevel, "aggressive");
});

test("streak recovery ladder day 1 is gentle", () => {
  const n = getStreakRecoveryNotification(1, "Ava", false);
  assert.ok(n);
  assert.equal(n!.recoveryDay, 1);
  assert.ok(n!.body.includes("Ava"));
});

test("learning outcome uses unfinished lesson copy", () => {
  const copy = buildLearningOutcomeCopy({
    childName: "Ava",
    lessonsCompletedTotal: 10,
    lessonsCompleted7d: 1,
    weakSubjects: ["english"],
    strongSubjects: [],
    unfinishedLessonCount: 2,
  });
  assert.ok(copy);
  assert.ok(copy!.body.includes("unfinished") || copy!.body.includes("lesson"));
});

test("routine outcome nudges missed yesterday", () => {
  const copy = buildRoutineOutcomeCopy({
    childName: "Ava",
    routineCompletionRate7d: 0.3,
    routinesCompletedToday: 0,
    routinesMissedYesterday: true,
    weeklyRoutineConsistency: 0.3,
    completedToday: 0,
    totalToday: 4,
    lateRoutineYesterday: false,
  });
  assert.ok(copy);
  assert.equal(copy!.goal, "GOAL_ROUTINE_COMPLETION");
});

test("subscription conversion requires activation", () => {
  assert.equal(
    shouldTriggerConversionJourney(baseSignals({ lessonsCompletedTotal: 2, firstRoutineCompleted: false })),
    false,
  );
  assert.equal(
    shouldTriggerConversionJourney(baseSignals({ lessonsCompletedTotal: 12, firstRoutineCompleted: true })),
    true,
  );
});

test("resolveOutcomeStrategy returns streak recovery when streak broken", () => {
  const signals = baseSignals({
    streakBrokenDaysAgo: 2,
    childLifecycleStage: "AT_RISK",
    parentMilestones: ["AT_RISK"],
  });
  const draft = resolveOutcomeStrategy({
    userId: "u1",
    category: "engagement",
    localDate: "2026-05-29",
    timezone: "Asia/Kolkata",
    signals,
  });
  assert.ok(draft);
  assert.equal(draft!.source, "streak_recovery");
});

test("causal attribution within 48h window", () => {
  const sentAt = new Date("2026-05-29T10:00:00Z");
  const openedAt = new Date("2026-05-29T10:05:00Z");
  const outcomeAt = new Date("2026-05-29T11:00:00Z");
  const attr = attributeOutcome({
    notificationLogId: 1,
    userId: "u1",
    sentAt,
    openedAt,
    outcomeEvent: "lesson_completed",
    outcomeAt,
  });
  assert.equal(attr.attributed, true);
});

test("outcome analytics tracks routine completions", () => {
  const sentAt = new Date();
  const summary = computeOutcomeAnalytics([
    {
      category: "routine",
      goal: "GOAL_ROUTINE_COMPLETION",
      sentAt,
      openedAt: sentAt,
      outcomeEvent: "routine_completed",
      outcomeAt: new Date(sentAt.getTime() + 3600000),
    },
  ]);
  assert.equal(summary.routineCompletionAfterNotification, 1);
  assert.ok(summary.outcomeRate > 0);
});

test("executive dashboard computes ROI by category", () => {
  const sentAt = new Date();
  const outcomeAnalytics = computeOutcomeAnalytics([
    {
      category: "learning_activity",
      goal: "GOAL_LEARNING_COMPLETION",
      sentAt,
      openedAt: sentAt,
      outcomeEvent: "lesson_completed",
      outcomeAt: new Date(sentAt.getTime() + 1800000),
    },
    {
      category: "engagement",
      goal: "GOAL_RETENTION",
      sentAt,
      openedAt: null,
      outcomeEvent: null,
      outcomeAt: null,
    },
  ]);
  const exec = computeExecutiveDashboard(outcomeAnalytics, [], 30);
  assert.equal(exec.notificationsSent, 2);
  assert.ok(exec.roiByCategory.length >= 1);
});

test("experiment variant assignment is deterministic", () => {
  const a = assignExperimentVariant("user-123", "coach_copy_v1", ["coach", "generic"]);
  const b = assignExperimentVariant("user-123", "coach_copy_v1", ["coach", "generic"]);
  assert.equal(a, b);
});

test("coach copy avoids generic open amynest", () => {
  const coached = coachifyCopy({
    title: "Reminder",
    body: "Open AmyNest now",
    childName: "Ava",
    goal: "GOAL_LEARNING_COMPLETION",
    signals: baseSignals(),
  });
  assert.ok(!coached.body.toLowerCase().includes("open amynest"));
  assert.ok(coached.body.includes("Ava") || coached.body.includes("lesson"));
});

test("every category maps to a goal", () => {
  assert.equal(goalForCategory("routine"), "GOAL_ROUTINE_COMPLETION");
  assert.equal(goalForCategory("phonics"), "GOAL_LEARNING_COMPLETION");
  assert.equal(goalForCategory("engagement"), "GOAL_RETENTION");
});
