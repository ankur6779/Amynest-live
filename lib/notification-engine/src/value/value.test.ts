import assert from "node:assert/strict";
import { test } from "node:test";
import { computeParentValueScore } from "./parent-value-score.js";
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
    routineCompletionRate7d: 0.5,
    routinesCompletedToday: 0,
    routinesMissedYesterday: false,
    weeklyRoutineConsistency: 0.5,
    lessonsCompletedTotal: 10,
    lessonsCompleted7d: 0,
    weakSubjects: [],
    strongSubjects: [],
    unfinishedLessonCount: 0,
    currentStreakDays: 0,
    streakBrokenDaysAgo: null,
    hadSevenDayStreak: false,
    firstRoutineCompleted: true,
    firstLearningCompleted: true,
    firstWeekComplete: true,
    firstMonthComplete: true,
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

test("no activity yields none band and null proof", () => {
  const v = computeParentValueScore(signals({ activity: {}, routinesCompletedToday: 0, lessonsCompleted7d: 0 }));
  assert.equal(v.band, "none");
  assert.equal(v.topProof, null);
});

test("rich activity yields high band with honest top proof", () => {
  const v = computeParentValueScore(
    signals({
      currentStreakDays: 7,
      activity: { routinesCompleted7d: 7, lessonsCompleted7d: 10, speechSessions7d: 5, worksheetsCompleted7d: 5 },
    }),
  );
  assert.equal(v.band, "high");
  assert.ok(v.topProof);
  assert.ok(v.topProof!.count > 0);
});

test("score is bounded 0-100", () => {
  const v = computeParentValueScore(
    signals({
      currentStreakDays: 30,
      activity: { routinesCompleted7d: 99, lessonsCompleted7d: 99, speechSessions7d: 99, nutritionPlans7d: 99, worksheetsCompleted7d: 99, storiesPlayed7d: 99, coachInteractions7d: 99 },
    }),
  );
  assert.ok(v.score <= 100 && v.score >= 0);
});

test("falls back to base signals when activity absent", () => {
  const v = computeParentValueScore(signals({ activity: undefined, lessonsCompleted7d: 4, routinesCompletedToday: 3 }));
  assert.ok(v.score > 0);
  assert.ok(v.topProof);
});
