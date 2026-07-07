import assert from "node:assert/strict";
import { test } from "node:test";
import { assessFatigue } from "./fatigue.js";
import { learnPreferredSendHour, resolveSendHour, learnPreferredSendHourWeighted } from "./send-time.js";
import { decideNotification } from "./decision-engine.js";

/* ── Fatigue ─────────────────────────────────────────────────────────────── */

test("no sends means fully fresh", () => {
  const f = assessFatigue({ sent7d: 0, opened7d: 0, dismissed7d: 0, consecutiveIgnored: 0 });
  assert.equal(f.level, "healthy");
  assert.equal(f.frequencyMultiplier, 1);
});

test("high engagement stays healthy even at volume", () => {
  const f = assessFatigue({ sent7d: 20, opened7d: 18, dismissed7d: 0, consecutiveIgnored: 0 });
  assert.equal(f.level, "healthy");
});

test("long ignore streak drives fatigue critical", () => {
  const f = assessFatigue({ sent7d: 12, opened7d: 0, dismissed7d: 4, consecutiveIgnored: 8 });
  assert.ok(f.score >= 80);
  assert.equal(f.level, "critical");
  assert.ok(f.frequencyMultiplier <= 0.1);
});

test("revoked permission is critical with zero frequency", () => {
  const f = assessFatigue({ sent7d: 5, opened7d: 2, dismissed7d: 0, consecutiveIgnored: 1, permissionGranted: false });
  assert.equal(f.frequencyMultiplier, 0);
  assert.equal(f.primaryDriver, "permission_revoked");
});

/* ── Smart send-time ─────────────────────────────────────────────────────── */

test("insufficient samples yields null hour and low confidence", () => {
  const r = learnPreferredSendHour([{ hourLocal: 8 }, { hourLocal: 9 }]);
  assert.equal(r.hourLocal, null);
  assert.ok(r.confidence < 0.5);
});

test("consistent open hour is learned with confidence", () => {
  const opens = Array.from({ length: 25 }, () => ({ hourLocal: 20 }));
  const r = learnPreferredSendHour(opens);
  assert.equal(r.hourLocal, 20);
  assert.ok(r.confidence >= 0.5);
});

test("resolveSendHour falls back to default when confidence low", () => {
  const low = resolveSendHour(19, { hourLocal: 6, confidence: 0.2, sampleSize: 3 });
  assert.equal(low.hourLocal, 19);
  assert.equal(low.source, "default");

  const high = resolveSendHour(19, { hourLocal: 8, confidence: 0.8, sampleSize: 30 });
  assert.equal(high.hourLocal, 8);
  assert.equal(high.source, "learned");
});

test("weighted send-time refuses to overfit tiny datasets", () => {
  const r = learnPreferredSendHourWeighted([{ hourLocal: 7, opened: true }]);
  assert.equal(r.hourLocal, null);
  assert.ok(r.confidence < 0.5);
});

test("weighted send-time favors converting hours over mere opens", () => {
  const events = [
    ...Array.from({ length: 6 }, () => ({ hourLocal: 9, opened: true })),
    { hourLocal: 20, converted: true, clicked: true, opened: true },
    { hourLocal: 20, converted: true, clicked: true, opened: true },
  ];
  const r = learnPreferredSendHourWeighted(events);
  assert.equal(r.hourLocal, 20);
});

test("weighted send-time penalizes dismissed hours", () => {
  const events = [
    ...Array.from({ length: 8 }, () => ({ hourLocal: 14, clicked: true, opened: true })),
    ...Array.from({ length: 5 }, () => ({ hourLocal: 8, dismissed: true })),
  ];
  const r = learnPreferredSendHourWeighted(events);
  assert.equal(r.hourLocal, 14);
});

/* ── Decision engine ─────────────────────────────────────────────────────── */

const healthy = assessFatigue({ sent7d: 4, opened7d: 3, dismissed7d: 0, consecutiveIgnored: 0 });

test("blocks when user is active in app", () => {
  const d = decideNotification(
    { goal: "GOAL_LEARNING_COMPLETION", priority: 70, monetization: false },
    { lifecycleStage: "DAILY_USER", fatigue: healthy, isActiveInAppNow: true },
  );
  assert.equal(d.send, false);
  assert.equal(d.reason, "user_active_in_app");
});

test("blocks monetization to premium users", () => {
  const d = decideNotification(
    { goal: "GOAL_SUBSCRIPTION", priority: 90, monetization: true },
    { lifecycleStage: "PREMIUM_SUBSCRIBER", fatigue: healthy, isPremium: true },
  );
  assert.equal(d.send, false);
  assert.equal(d.reason, "monetization_suppressed_premium");
});

test("critical message overrides quiet hours and fatigue", () => {
  const crit = assessFatigue({ sent7d: 14, opened7d: 0, dismissed7d: 6, consecutiveIgnored: 9 });
  const d = decideNotification(
    { goal: "GOAL_ROUTINE_COMPLETION", priority: 60, monetization: false, critical: true },
    { lifecycleStage: "DAILY_USER", fatigue: crit, inQuietHours: true },
  );
  assert.equal(d.send, true);
  assert.ok(d.factors.includes("critical_floor"));
});

test("high purchase intent boosts conversion above threshold", () => {
  const d = decideNotification(
    { goal: "GOAL_SUBSCRIPTION", priority: 40, monetization: true },
    { lifecycleStage: "HIGH_PURCHASE_INTENT", fatigue: healthy, highPurchaseIntent: true, openRate7d: 0.5 },
  );
  assert.equal(d.send, true);
  assert.ok(d.factors.includes("high_purchase_intent_boost"));
});

test("recent dismissal and low affinity suppress a low priority send", () => {
  const d = decideNotification(
    { goal: "GOAL_PARENT_ENGAGEMENT", priority: 45, monetization: false },
    {
      lifecycleStage: "DAILY_USER",
      fatigue: assessFatigue({ sent7d: 10, opened7d: 1, dismissed7d: 5, consecutiveIgnored: 4 }),
      openRate7d: 0.1,
      recentlyDismissedSameTopic: true,
    },
  );
  assert.equal(d.send, false);
});
