#!/usr/bin/env npx tsx
/**
 * Fixture dry-run for the signed-in re-engagement selector.
 *
 *   pnpm notif:reengagement-dry-run
 *
 * Does not send notifications and does not require a database.
 */
import type { OutcomeSignals } from "../outcomes/types.js";
import { decideReengagement, type ReengagementFacts } from "./engine.js";
import { formatDryRunLine, formatDryRunRow } from "./dry-run.js";

function signals(overrides: Partial<OutcomeSignals> = {}): OutcomeSignals {
  return {
    userId: "fixture",
    childId: 1,
    childName: "John",
    accountAgeDays: 20,
    daysSinceLastActive: 4,
    isPremium: false,
    isFreeTier: true,
    routineCompletionRate7d: 0.4,
    routinesCompletedToday: 0,
    routinesMissedYesterday: false,
    weeklyRoutineConsistency: 0.4,
    lessonsCompletedTotal: 2,
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
    churnRisk7d: 0.5,
    churnRisk30d: 0.4,
    churnRisk90d: 0.3,
    ...overrides,
  };
}

function facts(overrides: Partial<ReengagementFacts> = {}): ReengagementFacts {
  return {
    todayPlanExists: true,
    todayPlanOpened: false,
    onboardingIncomplete: false,
    routineOpenedNotStarted: false,
    hasSpeechPracticeDue: false,
    lastActiveAt: new Date("2026-08-20T08:00:00Z"),
    sentProactiveToday: 0,
    sentProactiveThisWeek: 0,
    lastSentByCategory: {},
    hasPushToken: true,
    permissionGranted: true,
    engagementOptIn: true,
    timezone: "UTC",
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    preferredHour: null,
    ...overrides,
  };
}

const NOW = new Date("2026-08-26T08:30:00Z");

const cases: Array<{ label: string; signals: OutcomeSignals; facts: ReengagementFacts }> = [
  {
    label: "NEW_USER unfinished onboarding",
    signals: signals({
      userId: "user-new",
      accountAgeDays: 2,
      daysSinceLastActive: 1,
      firstRoutineCompleted: false,
      firstLearningCompleted: false,
    }),
    facts: facts({ todayPlanExists: false, onboardingIncomplete: true }),
  },
  {
    label: "INACTIVE_7_DAYS today's plan ready",
    signals: signals({ userId: "user-week", daysSinceLastActive: 8 }),
    facts: facts({ todayPlanExists: true, todayPlanOpened: false }),
  },
  {
    label: "INACTIVE_30_DAYS win-back",
    signals: signals({
      userId: "user-month",
      daysSinceLastActive: 32,
      unfinishedLessonCount: 0,
      firstRoutineCompleted: false,
    }),
    facts: facts({ todayPlanExists: false }),
  },
  {
    label: "ACTIVE_USER already opened plan",
    signals: signals({
      userId: "user-active",
      daysSinceLastActive: 0,
      routinesCompletedToday: 1,
    }),
    facts: facts({ todayPlanOpened: true }),
  },
  {
    label: "quiet hours delay",
    signals: signals({ userId: "user-quiet", daysSinceLastActive: 5 }),
    facts: facts(),
  },
  {
    label: "permission denied",
    signals: signals({ userId: "user-denied" }),
    facts: facts({ permissionGranted: false }),
  },
];

const quietNow = new Date("2026-08-26T22:30:00Z");

console.log("AmyNest re-engagement dry-run (fixtures — no send)\n");
console.log("Frequency: max 1/day, max 4/week, quiet hours 22:00–07:00 local");
console.log("Mode default: dry_run  |  Live send: NOTIF_REENGAGEMENT_MODE=live\n");

for (const c of cases) {
  const now = c.label.includes("quiet") ? quietNow : NOW;
  const decision = decideReengagement({
    signals: c.signals,
    facts: c.facts,
    now,
    ignoreSendWindow: !c.label.includes("quiet"),
  });
  const row = formatDryRunRow(c.signals.userId, decision);
  console.log("────────────────────────────────────────");
  console.log(c.label);
  console.log(formatDryRunLine(row));
  if (row.title) console.log(`Title: ${row.title}`);
  if (row.body) console.log(`Body: ${row.body}`);
  console.log("");
}

console.log("Broad production re-engagement sending remains BLOCKED until live mode is set after review.");
