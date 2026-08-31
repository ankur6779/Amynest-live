import assert from "node:assert/strict";
import { test } from "node:test";
import {
  evaluateGlobalProactiveFatigue,
  minutesSince,
} from "./global-fatigue.js";
import {
  GLOBAL_PROACTIVE_POLICY,
  isProactiveNotificationCategory,
  isStalePushToken,
  isTransactionalNotificationCategory,
  PROACTIVE_NOTIFICATION_CATEGORIES,
  TRANSACTIONAL_NOTIFICATION_CATEGORIES,
} from "./proactive-policy.js";

const NOW = new Date("2026-08-31T08:30:00Z");

test("A: existing scheduler send blocks re-engagement via daily cap", () => {
  const d = evaluateGlobalProactiveFatigue({
    category: "engagement",
    sentProactiveToday: 1,
    sentProactiveThisWeek: 1,
    lastProactiveAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    lastAppOpenAt: null,
    now: NOW,
  });
  assert.equal(d.allow, false);
  assert.equal(d.reason, "global_daily_cap");
});

test("B: re-engagement send blocks existing scheduler via daily cap", () => {
  const d = evaluateGlobalProactiveFatigue({
    category: "routine",
    sentProactiveToday: 1,
    sentProactiveThisWeek: 1,
    lastProactiveAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    lastAppOpenAt: null,
    now: NOW,
  });
  assert.equal(d.allow, false);
  assert.equal(d.reason, "global_daily_cap");
});

test("C: existing notification 60 minutes ago blocks next proactive", () => {
  const d = evaluateGlobalProactiveFatigue({
    category: "parenting_tips",
    sentProactiveToday: 0,
    sentProactiveThisWeek: 1,
    lastProactiveAt: new Date(NOW.getTime() - 60 * 60 * 1000),
    lastAppOpenAt: null,
    now: NOW,
  });
  assert.equal(d.allow, false);
  assert.equal(d.reason, "recent_notification");
});

test("D: existing notification 2 hours ago allowed when daily/weekly permit", () => {
  const d = evaluateGlobalProactiveFatigue({
    category: "parenting_tips",
    sentProactiveToday: 0,
    sentProactiveThisWeek: 1,
    lastProactiveAt: new Date(NOW.getTime() - 2 * 60 * 60 * 1000),
    lastAppOpenAt: null,
    now: NOW,
  });
  assert.equal(d.allow, true);
  assert.equal(d.reason, null);
});

test("E: 4 proactive in rolling 7 days blocks the next", () => {
  const d = evaluateGlobalProactiveFatigue({
    category: "insights",
    sentProactiveToday: 0,
    sentProactiveThisWeek: 4,
    lastProactiveAt: new Date(NOW.getTime() - 26 * 60 * 60 * 1000),
    lastAppOpenAt: null,
    now: NOW,
  });
  assert.equal(d.allow, false);
  assert.equal(d.reason, "global_weekly_cap");
});

test("F: different categories still share the global count", () => {
  assert.equal(isProactiveNotificationCategory("routine"), true);
  assert.equal(isProactiveNotificationCategory("engagement"), true);
  const afterMorning = evaluateGlobalProactiveFatigue({
    category: "engagement",
    sentProactiveToday: 1,
    sentProactiveThisWeek: 1,
    lastProactiveAt: NOW,
    lastAppOpenAt: null,
    now: NOW,
  });
  assert.equal(afterMorning.allow, false);
  assert.equal(afterMorning.reason, "global_daily_cap");
});

test("G: transactional routine_item and infant_care bypass the global gate", () => {
  for (const category of TRANSACTIONAL_NOTIFICATION_CATEGORIES) {
    const d = evaluateGlobalProactiveFatigue({
      category,
      sentProactiveToday: 1,
      sentProactiveThisWeek: 4,
      lastProactiveAt: NOW,
      lastAppOpenAt: NOW,
      now: NOW,
    });
    assert.equal(d.allow, true, category);
    assert.equal(isTransactionalNotificationCategory(category), true);
  }
  assert.equal(isTransactionalNotificationCategory("routine"), false);
});

test("I: skip flag (test send) bypasses the gate", () => {
  const d = evaluateGlobalProactiveFatigue({
    category: "routine",
    skip: true,
    sentProactiveToday: 1,
    sentProactiveThisWeek: 4,
    lastProactiveAt: NOW,
    lastAppOpenAt: NOW,
    now: NOW,
  });
  assert.equal(d.allow, true);
});

test("recent app open within 90 minutes blocks proactive", () => {
  const d = evaluateGlobalProactiveFatigue({
    category: "engagement",
    sentProactiveToday: 0,
    sentProactiveThisWeek: 0,
    lastProactiveAt: null,
    lastAppOpenAt: new Date(NOW.getTime() - 10 * 60 * 1000),
    now: NOW,
  });
  assert.equal(d.allow, false);
  assert.equal(d.reason, "recent_app_open");
});

test("J: lastSeenAt older than 60 days is a stale token", () => {
  assert.equal(isStalePushToken(null, NOW), true);
  assert.equal(isStalePushToken(new Date(NOW.getTime() - 10 * 86400000), NOW), false);
  assert.equal(isStalePushToken(new Date(NOW.getTime() - 61 * 86400000), NOW), true);
});

test("policy constants and classification cover every shipped category once", () => {
  assert.equal(GLOBAL_PROACTIVE_POLICY.maxPerLocalDay, 1);
  assert.equal(GLOBAL_PROACTIVE_POLICY.maxPerRolling7Days, 4);
  assert.equal(GLOBAL_PROACTIVE_POLICY.minGapMinutes, 90);
  const all = [...PROACTIVE_NOTIFICATION_CATEGORIES, ...TRANSACTIONAL_NOTIFICATION_CATEGORIES];
  assert.deepEqual(
    [...all].sort(),
    [
      "engagement",
      "good_night",
      "infant_care",
      "insights",
      "learning_activity",
      "milestone",
      "nutrition",
      "parenting_tips",
      "phonics",
      "routine",
      "routine_item",
      "story_time",
      "weekly",
    ],
  );
});

test("minutesSince is null without a timestamp", () => {
  assert.equal(minutesSince(null, NOW), null);
  assert.equal(minutesSince(new Date(NOW.getTime() - 30 * 60 * 1000), NOW), 30);
});
