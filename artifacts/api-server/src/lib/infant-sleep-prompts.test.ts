import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildInfantSleepCoachPrompt,
  sanitizeInfantSleepCoachPlan,
} from "./infant-sleep-prompts.ts";

describe("infant-sleep-prompts", () => {
  it("builds prompt with safety guardrails and child context", () => {
    const prompt = buildInfantSleepCoachPrompt({
      childName: "Mia",
      ageMonths: 8,
      napSessions14d: [
        {
          kind: "nap",
          startedAt: "2026-06-01T10:00:00.000Z",
          endedAt: "2026-06-01T11:00:00.000Z",
          durationMin: 60,
        },
      ],
      sleepPrediction: { confidence: "medium", napsToday: 1 },
    });
    assert.match(prompt, /Mia/);
    assert.match(prompt, /8 months/);
    assert.match(prompt, /NOT medical advice/i);
    assert.match(prompt, /actionSteps/);
  });

  it("sanitizes plan and caps action steps at 5", () => {
    const plan = sanitizeInfantSleepCoachPlan({
      bedtimeRecommendation: "Start wind-down at 7pm.",
      wakeWindowAdjustments: ["Extend morning window by 15 min"],
      regressionAnalysis: "No regression noted.",
      napTransitionGuidance: "Hold at 2 naps.",
      weeklyFocus: "Consistent bedtime.",
      actionSteps: ["a", "b", "c", "d", "e", "f", "g"],
    });
    assert.ok(plan);
    assert.equal(plan!.actionSteps.length, 5);
    assert.equal(plan!.bedtimeRecommendation, "Start wind-down at 7pm.");
  });

  it("rejects plan without action steps", () => {
    assert.equal(
      sanitizeInfantSleepCoachPlan({ bedtimeRecommendation: "x" }),
      null,
    );
  });
});
