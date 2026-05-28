import { test } from "node:test";
import assert from "node:assert/strict";
import { buildParentInsights, type LearningSessionEvent } from "./insights.js";

const base = (over: Partial<LearningSessionEvent>): LearningSessionEvent => ({
  trickId: "t04",
  operation: "near_double",
  solvedVisually: true,
  usedThinkingReplay: false,
  abstractionLevel: 0.4,
  at: Date.now(),
  ...over,
});

test("empty events produce no insights", () => {
  assert.deepEqual(buildParentInsights([]), []);
});

test("independent strategy use is reported with the child's name", () => {
  const insights = buildParentInsights(
    [base({ strategy: "double_then_add_one", correct: true })],
    "Mia",
  );
  assert.ok(insights.some((i) => i.text.includes("Mia") && i.text.includes("Near-Double")));
  assert.ok(insights.some((i) => i.tone === "mastery"));
});

test("rising abstraction surfaces a concrete→abstract transition", () => {
  const events = [
    base({ abstractionLevel: 0.2 }),
    base({ abstractionLevel: 0.25 }),
    base({ abstractionLevel: 0.6 }),
    base({ abstractionLevel: 0.7 }),
  ];
  assert.ok(buildParentInsights(events).some((i) => i.id === "transition"));
});

test("revisiting reasoning is celebrated as deep thinking", () => {
  const insights = buildParentInsights([base({ usedThinkingReplay: true })]);
  assert.ok(insights.some((i) => i.id === "reasoning"));
});

test("insights are capped at four", () => {
  const events = Array.from({ length: 10 }, (_, i) =>
    base({ strategy: "equal_groups", correct: true, abstractionLevel: i / 10, usedThinkingReplay: true }),
  );
  assert.ok(buildParentInsights(events).length <= 4);
});
