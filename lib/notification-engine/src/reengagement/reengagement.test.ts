import assert from "node:assert/strict";
import { test } from "node:test";
import { inferInactivityReason, buildReengagementCopy } from "./reengagement.js";
import type { OutcomeSignals } from "../outcomes/types.js";

function signals(overrides: Partial<OutcomeSignals> = {}): OutcomeSignals {
  return {
    userId: "u1",
    childId: 1,
    childName: "Ava",
    accountAgeDays: 20,
    daysSinceLastActive: 3,
    isPremium: false,
    isFreeTier: true,
    routineCompletionRate7d: 0,
    routinesCompletedToday: 0,
    routinesMissedYesterday: false,
    weeklyRoutineConsistency: 0,
    lessonsCompletedTotal: 5,
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
    firstMonthComplete: false,
    activationJourneyDay: null,
    activationJourneyActive: false,
    notificationsOpened7d: 0,
    sessionsLast7d: 0,
    childLifecycleStage: "AT_RISK",
    parentMilestones: [],
    churnRisk7d: 0.8,
    churnRisk30d: 0.7,
    churnRisk90d: 0.6,
    ...overrides,
  };
}

test("never-activated users get an activation-focused message", () => {
  const s = signals({ firstRoutineCompleted: false, firstLearningCompleted: false });
  assert.equal(inferInactivityReason(s), "never_activated");
  const copy = buildReengagementCopy(s);
  assert.equal(copy.reason, "never_activated");
  assert.ok(copy.deepLink.includes("/routines/generate"));
});

test("missed routine yields unfinished_routine reason", () => {
  const s = signals({ routinesMissedYesterday: true });
  assert.equal(inferInactivityReason(s), "unfinished_routine");
  const copy = buildReengagementCopy(s);
  assert.equal(copy.reason, "unfinished_routine");
});

test("broken streak yields streak recovery goal", () => {
  const s = signals({ streakBrokenDaysAgo: 2, routineCompletionRate7d: 0.8, routinesMissedYesterday: false });
  assert.equal(inferInactivityReason(s), "streak_broken");
  const copy = buildReengagementCopy(s);
  assert.equal(copy.goal, "GOAL_STREAK_RECOVERY");
});

test("deep inactivity uses reactivation goal and gentle tone", () => {
  const s = signals({ daysSinceLastActive: 9, routinesMissedYesterday: true });
  const copy = buildReengagementCopy(s);
  assert.equal(copy.goal, "GOAL_REACTIVATION");
  assert.ok(copy.trigger.endsWith("d9"));
});

test("deep link always carries winback source for attribution", () => {
  const copy = buildReengagementCopy(signals());
  assert.ok(copy.deepLink.includes("source=notif_winback"));
});

test("copy references the child name and falls back safely", () => {
  const copy = buildReengagementCopy(signals({ childName: "" }));
  assert.ok(copy.body.includes("your child") || copy.title.includes("your child"));
});
