import assert from "node:assert/strict";
import { test } from "node:test";
import { inferParentPersona } from "./persona-engine.js";
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
    routinesCompletedToday: 1,
    routinesMissedYesterday: false,
    weeklyRoutineConsistency: 0.5,
    lessonsCompletedTotal: 10,
    lessonsCompleted7d: 2,
    weakSubjects: [],
    strongSubjects: [],
    unfinishedLessonCount: 0,
    currentStreakDays: 3,
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

test("occasional user with almost no activity", () => {
  const p = inferParentPersona(signals({ sessionsLast7d: 1, activity: { routinesCompleted7d: 0, lessonsCompleted7d: 0 } }));
  assert.equal(p.primary, "OCCASIONAL_USER");
  assert.equal(p.conversionReceptive, false);
});

test("routine-dominant behavior yields routine parent", () => {
  const p = inferParentPersona(signals({ activity: { routinesCompleted7d: 6, lessonsCompleted7d: 1 } }));
  assert.equal(p.primary, "ROUTINE_PARENT");
  assert.ok(p.preferredTopics.includes("routine"));
});

test("speech-dominant behavior yields speech parent", () => {
  const p = inferParentPersona(signals({ activity: { speechSessions7d: 6, lessonsCompleted7d: 1 } }));
  assert.equal(p.primary, "SPEECH_PARENT");
});

test("weekend concentration yields weekend parent", () => {
  const p = inferParentPersona(
    signals({ activity: { weekendActiveDays7d: 2, weekdayActiveDays7d: 0, routinesCompleted7d: 3 } }),
  );
  assert.equal(p.primary, "WEEKEND_PARENT");
});

test("broad shallow activity yields explorer", () => {
  const p = inferParentPersona(
    signals({ activity: { routinesCompleted7d: 1, lessonsCompleted7d: 1, speechSessions7d: 1, nutritionPlans7d: 1, storiesPlayed7d: 1 } }),
  );
  assert.equal(p.primary, "EXPLORER_PARENT");
});

test("premium + deep + broad yields power user", () => {
  const p = inferParentPersona(
    signals({
      isPremium: true,
      activity: { routinesCompleted7d: 5, lessonsCompleted7d: 5, speechSessions7d: 3, nutritionPlans7d: 2 },
    }),
  );
  assert.equal(p.primary, "PREMIUM_POWER_USER");
});
