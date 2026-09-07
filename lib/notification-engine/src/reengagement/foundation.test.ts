import assert from "node:assert/strict";
import { test } from "node:test";
import type { OutcomeSignals } from "../outcomes/types.js";
import { decideReengagement, type ReengagementFacts } from "./engine.js";
import { resolveReengagementSegment } from "./segments.js";
import { sanitizeLockScreenCopy, isSensitiveLockScreenCopy } from "./privacy.js";
import { buildCategoryCopy, copyVariantForUser } from "./copy.js";
import { formatDryRunRow } from "./dry-run.js";
import { parseReengagementMode, REENGAGEMENT_POLICY } from "./policy.js";
import { REENGAGEMENT_DEEP_LINKS } from "./taxonomy.js";

function signals(overrides: Partial<OutcomeSignals> = {}): OutcomeSignals {
  return {
    userId: "user-1",
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
    lastActiveAt: new Date("2026-08-27T08:00:00Z"),
    sentProactiveToday: 0,
    sentProactiveThisWeek: 0,
    lastProactiveAt: null,
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

/** Wednesday 2026-08-26 08:30 UTC — inside send window, not Sunday. */
const WED_0830 = new Date("2026-08-26T08:30:00Z");
/** Sunday 2026-08-30 08:30 UTC */
const SUN_0830 = new Date("2026-08-30T08:30:00Z");
/** Wednesday 22:30 UTC — quiet hours */
const WED_2230 = new Date("2026-08-26T22:30:00Z");

test("segments: inactivity buckets including 30 days", () => {
  assert.equal(resolveReengagementSegment(signals({ daysSinceLastActive: 0 })).segment, "ACTIVE_USER");
  assert.equal(resolveReengagementSegment(signals({ daysSinceLastActive: 2, accountAgeDays: 20 })).segment, "AT_RISK_USER");
  assert.equal(resolveReengagementSegment(signals({ daysSinceLastActive: 4 })).segment, "INACTIVE_3_DAYS");
  assert.equal(resolveReengagementSegment(signals({ daysSinceLastActive: 9 })).segment, "INACTIVE_7_DAYS");
  assert.equal(resolveReengagementSegment(signals({ daysSinceLastActive: 16 })).segment, "INACTIVE_14_DAYS");
  assert.equal(resolveReengagementSegment(signals({ daysSinceLastActive: 40 })).segment, "INACTIVE_30_DAYS");
});

test("segments: new user vs returned", () => {
  const neu = resolveReengagementSegment(
    signals({
      accountAgeDays: 3,
      daysSinceLastActive: 0,
      firstRoutineCompleted: false,
      firstLearningCompleted: false,
    }),
  );
  assert.equal(neu.segment, "NEW_USER");
  assert.equal(neu.neverActivated, true);

  const ret = resolveReengagementSegment(
    signals({
      daysSinceLastActive: 0,
      accountAgeDays: 20,
      hadSevenDayStreak: true,
      streakBrokenDaysAgo: 4,
    }),
  );
  assert.equal(ret.segment, "RETURNED_USER");
});

test("segments: account flavor from subscription source of truth", () => {
  assert.equal(resolveReengagementSegment(signals({ isPremium: true })).accountFlavor, "premium");
  assert.equal(
    resolveReengagementSegment(
      signals({ subscription: { status: "trialing", trialDaysRemaining: 5 } }),
    ).accountFlavor,
    "trial",
  );
  assert.equal(
    resolveReengagementSegment(
      signals({ subscription: { status: "canceled", subscriptionDaysRemaining: 2 } }),
    ).accountFlavor,
    "cancelled",
  );
  assert.equal(resolveReengagementSegment(signals({ isPremium: false })).accountFlavor, "free");
});

test("priority: unfinished beats today plan and winback", () => {
  const d = decideReengagement({
    signals: signals({ unfinishedLessonCount: 2, daysSinceLastActive: 4 }),
    facts: facts({ todayPlanExists: true }),
    now: WED_0830,
  });
  assert.equal(d.action, "would_send");
  assert.equal(d.candidate?.category, "UNFINISHED_ACTION");
  assert.equal(d.candidate?.copy.deepLink, REENGAGEMENT_DEEP_LINKS.learning);
});

test("today plan only when a real plan exists and is unopened", () => {
  const ready = decideReengagement({
    signals: signals({ daysSinceLastActive: 4, unfinishedLessonCount: 0 }),
    facts: facts({ todayPlanExists: true, todayPlanOpened: false }),
    now: WED_0830,
  });
  assert.equal(ready.candidate?.category, "TODAY_PLAN");
  assert.equal(ready.candidate?.copy.deepLink, "/routines");

  const none = decideReengagement({
    signals: signals({ daysSinceLastActive: 4, unfinishedLessonCount: 0, firstRoutineCompleted: false }),
    facts: facts({ todayPlanExists: false }),
    now: WED_0830,
  });
  assert.notEqual(none.candidate?.category, "TODAY_PLAN");
});

test("exactly one winner when multiple triggers qualify", () => {
  const d = decideReengagement({
    signals: signals({
      daysSinceLastActive: 4,
      unfinishedLessonCount: 1,
      routinesMissedYesterday: true,
    }),
    facts: facts({ todayPlanExists: true, onboardingIncomplete: true }),
    now: WED_0830,
  });
  assert.equal(d.action, "would_send");
  assert.equal(d.candidate?.category, "UNFINISHED_ACTION");
  assert.equal(d.candidate?.copy.deepLink, REENGAGEMENT_DEEP_LINKS.onboarding);
});

test("active user with no unfinished and opened plan is skipped", () => {
  const d = decideReengagement({
    signals: signals({
      daysSinceLastActive: 0,
      unfinishedLessonCount: 0,
      routinesCompletedToday: 1,
    }),
    facts: facts({ todayPlanExists: true, todayPlanOpened: true }),
    now: WED_0830,
  });
  assert.equal(d.action, "skip");
  assert.equal(d.skipCode, "no_eligible_candidate");
});

test("daily and weekly caps block send", () => {
  const daily = decideReengagement({
    signals: signals(),
    facts: facts({ sentProactiveToday: 1 }),
    now: WED_0830,
  });
  assert.equal(daily.skipCode, "global_daily_cap");
  assert.equal(daily.action, "skip");

  const weekly = decideReengagement({
    signals: signals(),
    facts: facts({ sentProactiveThisWeek: 4 }),
    now: WED_0830,
  });
  assert.equal(weekly.skipCode, "global_weekly_cap");
});

test("quiet hours delay; permission and opt-out skip", () => {
  const quiet = decideReengagement({
    signals: signals(),
    facts: facts(),
    now: WED_2230,
  });
  assert.equal(quiet.action, "delay");
  assert.equal(quiet.skipCode, "quiet_hours");
  assert.ok(quiet.candidate);

  const perm = decideReengagement({
    signals: signals(),
    facts: facts({ permissionGranted: false }),
    now: WED_0830,
  });
  assert.equal(perm.skipCode, "permission_denied");

  const opt = decideReengagement({
    signals: signals(),
    facts: facts({ engagementOptIn: false }),
    now: WED_0830,
  });
  assert.equal(opt.skipCode, "opted_out");

  const token = decideReengagement({
    signals: signals(),
    facts: facts({ hasPushToken: false }),
    now: WED_0830,
  });
  assert.equal(token.skipCode, "no_token");
});

test("recent app open suppresses proactive send", () => {
  const d = decideReengagement({
    signals: signals({ daysSinceLastActive: 4 }),
    facts: facts({ lastActiveAt: new Date(WED_0830.getTime() - 20 * 60 * 1000) }),
    now: WED_0830,
  });
  assert.equal(d.skipCode, "recent_app_open");
  assert.equal(d.action, "skip");
});

test("C: proactive 60 minutes ago is suppressed by global gap", () => {
  const d = decideReengagement({
    signals: signals({ daysSinceLastActive: 4 }),
    facts: facts({
      lastProactiveAt: new Date(WED_0830.getTime() - 60 * 60 * 1000),
      sentProactiveThisWeek: 1,
    }),
    now: WED_0830,
  });
  assert.equal(d.skipCode, "recent_notification");
});

test("J: stale token skips send", () => {
  const d = decideReengagement({
    signals: signals(),
    facts: facts({ hasPushToken: true, tokenStale: true }),
    now: WED_0830,
  });
  assert.equal(d.skipCode, "stale_token");
});

test("category cooldown blocks the duplicate but can fall through", () => {
  const d = decideReengagement({
    signals: signals({ daysSinceLastActive: 4, unfinishedLessonCount: 0 }),
    facts: facts({
      todayPlanExists: true,
      lastSentByCategory: { TODAY_PLAN: new Date(WED_0830.getTime() - 60 * 60 * 1000) },
    }),
    now: WED_0830,
  });
  assert.notEqual(d.candidate?.category, "TODAY_PLAN");
});

test("winback copy is warm and non-shaming at 3 / 14 / 30 days", () => {
  const d3 = decideReengagement({
    signals: signals({ daysSinceLastActive: 4, unfinishedLessonCount: 0, firstRoutineCompleted: false }),
    facts: facts({ todayPlanExists: false }),
    now: WED_0830,
  });
  assert.equal(d3.segment, "INACTIVE_3_DAYS");
  assert.ok(
    d3.candidate?.category === "WINBACK" ||
      d3.candidate?.category === "AMY_COMPANION" ||
      d3.candidate?.category === "ROUTINE_CONTINUITY",
  );

  const copy30 = buildCategoryCopy({
    userId: "u",
    category: "WINBACK",
    segment: "INACTIVE_30_DAYS",
    daysSinceLastActive: 35,
  });
  assert.match(copy30.title.toLowerCase(), /whenever|calmer next step/);
  assert.doesNotMatch(copy30.body.toLowerCase(), /you abandoned|you're failing|miss out/);
});

test("weekly recap only on Sunday when there is history", () => {
  const sun = decideReengagement({
    signals: signals({ daysSinceLastActive: 0, unfinishedLessonCount: 0, routinesCompletedToday: 1 }),
    facts: facts({ todayPlanExists: true, todayPlanOpened: true }),
    now: SUN_0830,
  });
  assert.equal(sun.candidate?.category, "WEEKLY_RECAP");
  assert.equal(sun.candidate?.copy.deepLink, "/progress");

  const wed = decideReengagement({
    signals: signals({ daysSinceLastActive: 0, unfinishedLessonCount: 0, routinesCompletedToday: 1 }),
    facts: facts({ todayPlanExists: true, todayPlanOpened: true }),
    now: WED_0830,
  });
  assert.notEqual(wed.candidate?.category, "WEEKLY_RECAP");
});

test("privacy: clinical lock-screen copy is rewritten", () => {
  assert.equal(isSensitiveLockScreenCopy("John's speech problem", "try therapy"), true);
  const safe = sanitizeLockScreenCopy("John's speech problem", "Needs therapy today");
  assert.equal(safe.title, "Amy has something ready for today");
  assert.doesNotMatch(safe.body, /speech|therapy/i);
});

test("K: child name never appears in lock-screen proactive copy", () => {
  const categories = [
    "UNFINISHED_ACTION",
    "TODAY_PLAN",
    "CHILD_CONTEXT",
    "ROUTINE_CONTINUITY",
    "AMY_COMPANION",
    "WEEKLY_RECAP",
    "WINBACK",
    "GENERIC_REMINDER",
  ] as const;
  for (const category of categories) {
    const copy = buildCategoryCopy({
      userId: "user-aaa",
      category,
      segment: "INACTIVE_7_DAYS",
      childName: "John",
      daysSinceLastActive: 8,
    });
    assert.doesNotMatch(copy.title, /John/i, category);
    assert.doesNotMatch(copy.body, /John/i, category);
  }
  const planReady = buildCategoryCopy({
    userId: "user-week",
    category: "TODAY_PLAN",
    segment: "INACTIVE_7_DAYS",
    childName: "John",
    daysSinceLastActive: 8,
  });
  assert.equal(planReady.variant, "plan_ready");
  assert.equal(planReady.title, "Today's plan is ready");
});

test("A/B copy variant is deterministic per user", () => {
  const a = copyVariantForUser("user-aaa");
  const b = copyVariantForUser("user-aaa");
  assert.equal(a, b);
  assert.ok(a === "plan_ready" || a === "next_right_thing");
});

test("premium users never get a conversion/upsell candidate", () => {
  const d = decideReengagement({
    signals: signals({ isPremium: true, subscription: { status: "active" }, daysSinceLastActive: 8 }),
    facts: facts({ todayPlanExists: false }),
    now: WED_0830,
  });
  assert.notEqual(d.candidate?.copy.deepLink, "/pricing");
  assert.ok(d.accountFlavor === "premium");
});

test("dry-run row explains who/what/why", () => {
  const d = decideReengagement({
    signals: signals({ daysSinceLastActive: 8 }),
    facts: facts({ todayPlanExists: true }),
    now: WED_0830,
  });
  const row = formatDryRunRow("user-1", d);
  assert.equal(row.userId, "user-1");
  assert.equal(row.segment, "INACTIVE_7_DAYS");
  assert.ok(row.candidate);
  assert.equal(row.action, "would_send");
  assert.equal(row.deepLink?.startsWith("/"), true);
  assert.equal(row.cooldown, "PASS");
});

test("new user unfinished onboarding deep-links to generate", () => {
  const d = decideReengagement({
    signals: signals({
      accountAgeDays: 2,
      daysSinceLastActive: 1,
      firstRoutineCompleted: false,
      firstLearningCompleted: false,
    }),
    facts: facts({ todayPlanExists: false, onboardingIncomplete: true }),
    now: WED_0830,
  });
  assert.equal(d.segment, "NEW_USER");
  assert.equal(d.candidate?.category, "UNFINISHED_ACTION");
  assert.equal(d.candidate?.copy.deepLink, "/routines/generate");
});

test("parseReengagementMode defaults to dry_run", () => {
  assert.equal(parseReengagementMode(undefined), "dry_run");
  assert.equal(parseReengagementMode("LIVE"), "live");
  assert.equal(parseReengagementMode("nope"), "dry_run");
  assert.equal(parseReengagementMode("off"), "off");
});

test("policy caps match product brief", () => {
  assert.equal(REENGAGEMENT_POLICY.maxProactivePerDay, 1);
  assert.equal(REENGAGEMENT_POLICY.maxProactivePerWeek, 4);
});

test("cancelled and trial accounts still get product re-engagement, not paywall", () => {
  for (const status of ["trialing", "canceled"] as const) {
    const d = decideReengagement({
      signals: signals({
        daysSinceLastActive: 9,
        subscription: { status },
        isPremium: status === "trialing",
      }),
      facts: facts({ todayPlanExists: true }),
      now: WED_0830,
    });
    assert.ok(d.candidate);
    assert.notEqual(d.candidate?.copy.deepLink, "/pricing");
  }
});
