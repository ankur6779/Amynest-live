import assert from "node:assert/strict";
import { test } from "node:test";
import { assessDiversity, inferEmotionalAngle } from "./diversity-engine.js";
import type { HistoryEntry } from "../types.js";

function entry(overrides: Partial<HistoryEntry>): HistoryEntry {
  return {
    category: "engagement",
    title: "Title",
    body: "Body text here",
    contentHash: null,
    topicKey: null,
    recommendationKey: null,
    theme: null,
    sentAt: new Date(),
    openedAt: null,
    dismissedAt: null,
    ...overrides,
  };
}

test("fresh candidate against empty history scores high", () => {
  const a = assessDiversity({ category: "routine", title: "Morning routine", body: "Start the day with Ava's plan" }, []);
  assert.ok(a.score >= 90);
  assert.equal(a.repetitive, false);
});

test("repeated category within window lowers score", () => {
  const history = [
    entry({ category: "nutrition", body: "Try a healthy snack today" }),
    entry({ category: "nutrition", body: "A balanced lunch idea for Ava" }),
  ];
  const a = assessDiversity({ category: "nutrition", title: "Dinner idea", body: "A wholesome dinner suggestion" }, history);
  assert.ok(a.collisions.includes("category"));
  assert.ok(a.score < 90);
});

test("near-duplicate wording flagged as repetitive", () => {
  const history = [entry({ body: "Complete one item on Ava's routine to keep the streak going" })];
  const a = assessDiversity(
    { category: "routine", title: "Reminder", body: "Complete one item on Ava's routine to keep the streak going today" },
    history,
  );
  assert.ok(a.collisions.includes("wording"));
});

test("rotateToward suggests unused categories", () => {
  const history = [entry({ category: "engagement" }), entry({ category: "nutrition" })];
  const a = assessDiversity({ category: "engagement", title: "Hi", body: "Some fresh distinct message" }, history);
  assert.ok(a.rotateToward.length > 0);
  assert.ok(!a.rotateToward.includes("engagement"));
});

test("emotional angle inference", () => {
  assert.equal(inferEmotionalAngle("Great job!", "Ava hit a 7-day streak 🎉"), "celebration");
  assert.equal(inferEmotionalAngle("Ending soon", "Your trial expires today"), "urgency");
  assert.equal(inferEmotionalAngle("No pressure", "Everything is saved, whenever you're ready"), "reassurance");
});
