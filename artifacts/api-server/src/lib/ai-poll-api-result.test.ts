import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shapePollApiResult } from "./ai-poll-api-result.js";
import type { AiJobRecord } from "../queue/types.js";
import { wrapJobInput } from "../queue/ai-job-payload.js";

function job(partial: Partial<AiJobRecord> & Pick<AiJobRecord, "type">): AiJobRecord {
  return {
    id: "job-1",
    userId: "user-1",
    status: "completed",
    createdAt: 1,
    updatedAt: 2,
    ...partial,
  };
}

describe("shapePollApiResult P0 contracts", () => {
  it("speech/transcribe maps worker text to transcript", async () => {
    const shaped = await shapePollApiResult(
      job({
        type: "speech.transcribe",
        payload: wrapJobInput("speech/transcribe", {}),
      }),
      { text: "hello world" },
    );
    assert.deepEqual(shaped, { transcript: "hello world" });
  });

  it("ai/assistant-ai maps content to answer", async () => {
    const shaped = await shapePollApiResult(
      job({
        type: "openai.chat",
        payload: wrapJobInput("ai/assistant-ai", { namespace: "amy-assistant" }, {
          question: "How do I help bedtime?",
          childName: "Mia",
          childAge: 3,
        }),
      }),
      { content: "Try a calm wind-down." },
    );
    assert.equal((shaped as { answer: string }).answer, "Try a calm wind-down.");
  });

  it("ai/assistant-ai skipSideEffects returns same answer shape", async () => {
    const j = job({
      type: "openai.chat",
      payload: wrapJobInput("ai/assistant-ai", { namespace: "amy-assistant" }, {
        question: "How do I help bedtime?",
        userId: "user-1",
      }),
    });
    const shaped = await shapePollApiResult(j, { content: "Try a calm wind-down." }, {
      skipSideEffects: true,
    });
    assert.equal((shaped as { answer: string }).answer, "Try a calm wind-down.");
  });

  it("ai/ai-tutor maps JSON content to reply envelope", async () => {
    const pollContext = {
      mode: "teach" as const,
      ageBand: "5-7" as const,
      topic: "addition",
      message: "Teach me addition",
      cacheKey: "abc123",
      userId: "user-1",
    };
    const shaped = await shapePollApiResult(
      job({
        type: "openai.chat_json",
        payload: wrapJobInput("ai/ai-tutor", { namespace: "ai-tutor:abc123" }, pollContext),
      }),
      {
        content: JSON.stringify({
          type: "teach",
          content: "Addition means putting numbers together.",
          examples: ["2 + 2 = 4"],
          question: null,
          options: [],
          answer: null,
        }),
      },
      { skipSideEffects: true },
    ) as { reply: { content: string }; mode: string; ageBand: string };
    assert.equal(shaped.reply.content, "Addition means putting numbers together.");
    assert.equal(shaped.mode, "teach");
    assert.equal(shaped.ageBand, "5-7");
  });

  it("infant-sleep/coach-plan returns ok plan envelope", async () => {
    const plan = { title: "Sleep plan", nights: [] };
    const shaped = await shapePollApiResult(
      job({
        type: "infant.sleep_coach",
        payload: wrapJobInput("infant-sleep/coach-plan", {}, { userId: "u1", childId: 2 }),
      }),
      { plan },
    ) as { ok: boolean; plan: unknown; cached: boolean; generatedAt?: string };
    assert.equal(shaped.ok, true);
    assert.deepEqual(shaped.plan, plan);
    assert.equal(shaped.cached, false);
    assert.equal(typeof shaped.generatedAt, "string");
  });

  it("infant-feeding/plan returns ok plan envelope", async () => {
    const plan = { dailySchedule: [] };
    const shaped = await shapePollApiResult(
      job({
        type: "infant.feeding_plan",
        payload: wrapJobInput("infant-feeding/plan", {}, { userId: "u1", childId: 2 }),
      }),
      { plan },
    ) as { ok: boolean; plan: unknown };
    assert.equal(shaped.ok, true);
    assert.deepEqual(shaped.plan, plan);
  });
});
