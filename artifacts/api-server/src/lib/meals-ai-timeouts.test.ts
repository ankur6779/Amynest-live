import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  MEALS_AI_MAX_COMPLETION_TOKENS,
  MEALS_AI_OPENAI_TIMEOUT_MS,
  getMealsAiWorkerTimeoutMs,
  resetMealsAiTimeoutsForTests,
} from "./meals-ai-timeouts.js";

describe("meals-ai-timeouts", () => {
  beforeEach(() => {
    resetMealsAiTimeoutsForTests();
  });

  it("defaults OpenAI to 40s and worker to at least OpenAI + 5s", () => {
    assert.equal(MEALS_AI_OPENAI_TIMEOUT_MS, 40_000);
    assert.equal(getMealsAiWorkerTimeoutMs(), 60_000);
    assert.ok(getMealsAiWorkerTimeoutMs() > MEALS_AI_OPENAI_TIMEOUT_MS);
  });

  it("keeps worker above OpenAI when AI_JOB_TIMEOUT_MS is low (production regression)", () => {
    process.env.AI_JOB_TIMEOUT_MS = "10000";
    process.env.MEALS_AI_OPENAI_TIMEOUT_MS = "40000";
    assert.equal(getMealsAiWorkerTimeoutMs(), 45_000);
  });

  it("defaults max completion tokens to 1500", () => {
    assert.equal(MEALS_AI_MAX_COMPLETION_TOKENS, 1500);
  });
});
