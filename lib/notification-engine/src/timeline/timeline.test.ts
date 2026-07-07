import assert from "node:assert/strict";
import { test } from "node:test";
import { detectTimelineEvent } from "./family-timeline.js";

test("birthday today is highest priority and warm", () => {
  const e = detectTimelineEvent({ childName: "Ava", birthdayInDays: 0 });
  assert.equal(e.type, "birthday_today");
  assert.ok(e.priority >= 90);
  assert.ok(e.body.includes("Ava"));
});

test("upcoming birthday within a week", () => {
  const e = detectTimelineEvent({ childName: "Ava", birthdayInDays: 3 });
  assert.equal(e.type, "birthday_upcoming");
  assert.ok(e.body.includes("3 days"));
});

test("age transition at a stage boundary", () => {
  const e = detectTimelineEvent({ childName: "Ava", ageMonths: 36 });
  assert.equal(e.type, "age_transition");
  assert.equal(e.goal, "GOAL_LEARNING_COMPLETION");
});

test("nothing due returns none", () => {
  const e = detectTimelineEvent({ childName: "Ava", ageMonths: 40, birthdayInDays: 200 });
  assert.equal(e.type, "none");
  assert.equal(e.priority, 0);
});

test("safe name fallback", () => {
  const e = detectTimelineEvent({ childName: "  ", birthdayInDays: 0 });
  assert.ok(e.title.includes("your child"));
});
