import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { wrapJobInput } from "../../queue/ai-job-payload.js";
import type { AiJobRecord } from "../../queue/types.js";
import {
  speechTranscribeContract,
  assistantAiContract,
  infantSleepCoachContract,
  infantFeedingPlanContract,
  routineGenerateAiContract,
  listMigratedRouteNames,
  listRoutesByWave,
} from "./index.js";
import { shapePollApiResult } from "../ai-poll-api-result.js";
import {
  resolveSyncApiBody,
  resolvePollApiBody,
  shouldUseRegistryForPayload,
} from "../ai-job-finalize.js";

function mockJob(partial: Partial<AiJobRecord> & Pick<AiJobRecord, "type">): AiJobRecord {
  return {
    id: "test-job",
    userId: "user-1",
    status: "completed",
    createdAt: 1,
    updatedAt: 2,
    ...partial,
  };
}

describe("AI finalize registry — wave inventory", () => {
  it("lists all three waves (5 routes)", () => {
    assert.deepEqual(listMigratedRouteNames().sort(), [
      "ai/assistant-ai",
      "infant-feeding/plan",
      "infant-sleep/coach-plan",
      "routines/generate-ai",
      "speech/transcribe",
    ]);
    assert.deepEqual(listRoutesByWave(1).sort(), ["ai/assistant-ai", "speech/transcribe"]);
    assert.deepEqual(listRoutesByWave(2).sort(), [
      "infant-feeding/plan",
      "infant-sleep/coach-plan",
    ]);
    assert.deepEqual(listRoutesByWave(3), ["routines/generate-ai"]);
  });
});

describe("Wave 1 parity — speech/transcribe", () => {
  const raw = { text: "hello parent" };

  it("registry finalize matches legacy inline buildSyncBody", () => {
    const registry = speechTranscribeContract.finalize(raw, {});
    const legacyInline = { transcript: (raw as { text: string }).text };
    assert.deepEqual(registry, legacyInline);
  });

  it("registry finalize matches legacy poll shape", async () => {
    const registry = speechTranscribeContract.finalize(raw, {});
    const legacyPoll = await shapePollApiResult(
      mockJob({
        type: "speech.transcribe",
        payload: wrapJobInput("speech/transcribe", {}),
        result: raw,
      }),
      raw,
    );
    assert.deepEqual(registry, legacyPoll);
  });
});

describe("Wave 1 parity — ai/assistant-ai", () => {
  const ctx = {
    question: "How do I handle bedtime?",
    childName: "Mia",
    childAge: 4,
    userId: "user-1",
  };
  const raw = { content: "Try a calm routine." };

  it("registry finalize matches legacy buildSyncBody shape", () => {
    const registry = assistantAiContract.finalize(raw, ctx);
    assert.equal(registry.answer, "Try a calm routine.");
  });

  it("registry finalize matches legacy poll shape", async () => {
    const registry = assistantAiContract.finalize(raw, ctx);
    const legacyPoll = await shapePollApiResult(
      mockJob({
        type: "openai.chat",
        payload: wrapJobInput("ai/assistant-ai", { namespace: "amy-assistant" }, ctx),
        result: raw,
      }),
      raw,
    );
    assert.deepEqual(registry, legacyPoll);
  });

  it("FAQ fallback when content empty", async () => {
    const registry = assistantAiContract.finalize({ content: "" }, ctx);
    const legacyPoll = await shapePollApiResult(
      mockJob({
        type: "openai.chat",
        payload: wrapJobInput("ai/assistant-ai", {}, ctx),
        result: { content: "" },
      }),
      { content: "" },
    );
    assert.equal(registry.answer, (legacyPoll as { answer: string }).answer);
    assert.ok(registry.answer.length > 0);
  });
});

describe("Wave 2 parity — infant plans", () => {
  const sleepPlan = {
    bedtimeRecommendation: "7:30 PM",
    wakeWindowAdjustments: [],
    regressionAnalysis: "stable",
    napTransitionGuidance: "none",
    weeklyGoals: [],
    parentTips: [],
  } as import("../infant-sleep-prompts.js").InfantSleepCoachPlan;

  const feedingPlan = {
    roadmapSummary: "Start solids",
    allergyIntroTimeline: "week 1",
    allergyIntroductionRoadmap: [],
    portionGuidance: "small portions",
    days: [],
  } as import("../infant-feeding-prompts.js").InfantFeedingPlan;

  it("infant-sleep registry matches legacy poll envelope", async () => {
    const ctx = { userId: "u1", childId: 2, context: { childAgeMonths: 8 } };
    const raw = { plan: sleepPlan };
    const registry = infantSleepCoachContract.finalize(raw, ctx);
    const legacyPoll = await shapePollApiResult(
      mockJob({
        type: "infant.sleep_coach",
        payload: wrapJobInput("infant-sleep/coach-plan", {}, ctx),
        result: raw,
      }),
      raw,
    );
    assert.equal((registry as { ok: boolean }).ok, true);
    assert.deepEqual((registry as { plan: unknown }).plan, sleepPlan);
    assert.deepEqual((registry as { plan: unknown }).plan, (legacyPoll as { plan: unknown }).plan);
    assert.equal((legacyPoll as { cached: boolean }).cached, false);
  });

  it("infant-feeding registry matches legacy poll envelope", async () => {
    const ctx = { userId: "u1", childId: 2, context: {}, ageMonths: 10 };
    const raw = { plan: feedingPlan };
    const registry = infantFeedingPlanContract.finalize(raw, ctx);
    const legacyPoll = await shapePollApiResult(
      mockJob({
        type: "infant.feeding_plan",
        payload: wrapJobInput("infant-feeding/plan", {}, ctx),
        result: raw,
      }),
      raw,
    );
    assert.deepEqual((registry as { plan: unknown }).plan, (legacyPoll as { plan: unknown }).plan);
  });
});

describe("Wave 3 — routines/generate-ai registry wiring", () => {
  it("contract is registered for routines route", () => {
    assert.equal(routineGenerateAiContract.routeName, "routines/generate-ai");
    assert.equal(routineGenerateAiContract.wave, 3);
  });
});

describe("Feature flag AI_FINALIZE_REGISTRY", () => {
  const prev = process.env.AI_FINALIZE_REGISTRY;

  after(() => {
    if (prev === undefined) delete process.env.AI_FINALIZE_REGISTRY;
    else process.env.AI_FINALIZE_REGISTRY = prev;
  });

  it("legacy path when flag off", async () => {
    delete process.env.AI_FINALIZE_REGISTRY;
    const payload = wrapJobInput("speech/transcribe", {});
    assert.equal(shouldUseRegistryForPayload(payload), false);
    const body = await resolveSyncApiBody({
      rawResult: { text: "x" },
      payload,
      userId: "u1",
      buildSyncBody: (r) => ({ transcript: (r as { text: string }).text }),
    });
    assert.deepEqual(body, { transcript: "x" });
  });

  it("registry path when flag on", async () => {
    process.env.AI_FINALIZE_REGISTRY = "true";
    const payload = wrapJobInput("speech/transcribe", {});
    assert.equal(shouldUseRegistryForPayload(payload), true);
    const body = await resolveSyncApiBody({
      rawResult: { text: "y" },
      payload,
      userId: "u1",
      buildSyncBody: () => ({ transcript: "should-not-use" }),
    });
    assert.deepEqual(body, { transcript: "y" });
  });

  it("poll falls back to shapePollApiResult when flag off", async () => {
    delete process.env.AI_FINALIZE_REGISTRY;
    const job = mockJob({
      type: "speech.transcribe",
      payload: wrapJobInput("speech/transcribe", {}),
      result: { text: "z" },
    });
    const body = await resolvePollApiBody(job);
    assert.deepEqual(body, { transcript: "z" });
  });
});
