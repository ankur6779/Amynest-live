import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateQuality } from "./quality-ai.js";

test("a warm, specific, actionable message passes", () => {
  const q = evaluateQuality({
    title: "Ava's 5-day streak 🌟",
    body: "Keep it going — try one quick lesson with Ava today.",
    goal: "GOAL_LEARNING_COMPLETION",
  });
  assert.equal(q.passed, true);
  assert.ok(q.score >= 60);
});

test("generic filler copy is rejected", () => {
  const q = evaluateQuality({ title: "Reminder", body: "Open AmyNest now." });
  assert.equal(q.passed, false);
  assert.ok(q.reasons.some((r) => r.startsWith("generic")));
});

test("spammy shouting copy is rejected", () => {
  const q = evaluateQuality({ title: "WINNER!!!", body: "FREE!!! ACT NOW 100% GUARANTEED" });
  assert.equal(q.passed, false);
  assert.ok(q.dimensions.spamRisk < 40);
});

test("fake urgency in monetization copy is penalized", () => {
  const q = evaluateQuality({
    title: "Last chance",
    body: "Hurry, upgrade now, only today!",
    goal: "GOAL_SUBSCRIPTION",
    monetization: true,
  });
  assert.equal(q.passed, false);
  assert.ok(q.reasons.some((r) => r.startsWith("fake_urgency") || r.startsWith("sales_pressure")));
});

test("overly long body is penalized", () => {
  const long = "This is a very long notification body that keeps going well beyond what a parent wants to read on a lock screen and should be penalized for length.";
  const q = evaluateQuality({ title: "A thoughtful update for you", body: long });
  assert.ok(q.dimensions.length < 80);
});

test("missing body hard-fails", () => {
  const q = evaluateQuality({ title: "Hello", body: "" });
  assert.equal(q.passed, false);
});
