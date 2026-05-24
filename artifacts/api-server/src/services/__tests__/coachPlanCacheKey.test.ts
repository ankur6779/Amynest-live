import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCoachPlanCacheKey,
  buildCoachWinListenText,
  buildInfantCoachPlanCacheKey,
  hashCoachListenText,
} from "../coachPlanCacheKey.js";

test("buildCoachPlanCacheKey is stable for same inputs", () => {
  const input = {
    goal: "manage-tantrums",
    ageGroup: "5-7",
    severity: "moderate",
    triggers: ["hunger", "tired"],
    routine: "Inconsistent",
    topicAnswers: { common_duration: "weeks" },
  };
  const a = buildCoachPlanCacheKey(input);
  const b = buildCoachPlanCacheKey({ ...input, triggers: ["tired", "hunger"] });
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{40}$/);
});

test("buildInfantCoachPlanCacheKey is stable per goal", () => {
  const a = buildInfantCoachPlanCacheKey("baby-not-sleeping");
  const b = buildInfantCoachPlanCacheKey("baby-not-sleeping");
  assert.equal(a, b);
  assert.match(a, /^[a-f0-9]{40}$/);
  assert.notEqual(a, buildInfantCoachPlanCacheKey("excessive-crying"));
});

test("buildCoachWinListenText joins win fields verbatim", () => {
  const text = buildCoachWinListenText({
    win: 2,
    title: "Connect first",
    objective: "Build trust",
    deep_explanation: "Science bit",
    actions: ["Kneel down", "Wait"],
    example: "Example line",
    mistake_to_avoid: "Don't yell",
    micro_task: "Try today",
  });
  assert.ok(text.includes("2. Connect first."));
  assert.ok(text.includes("Build trust"));
  assert.equal(hashCoachListenText(text), hashCoachListenText(text));
});
