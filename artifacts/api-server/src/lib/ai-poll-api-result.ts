import type { AiJobRecord } from "../queue/types.js";
import { unwrapJobPayload } from "../queue/ai-job-payload.js";
import { getParentingAdvice } from "./parenting-faq.js";
import type { InfantSleepCoachPlan } from "./infant-sleep-prompts.js";
import type { InfantFeedingPlan } from "./infant-feeding-prompts.js";

/** Map raw worker results to the same API shapes as inline `buildSyncBody` (P0 cutover). */
export async function shapePollApiResult(
  job: AiJobRecord,
  rawResult: unknown,
): Promise<unknown> {
  if (rawResult === undefined || rawResult === null) return rawResult;

  const wrapped = job.payload ? unwrapJobPayload(job.payload) : null;
  const routeName = wrapped?.routeName ?? inferLegacyRouteName(job);

  switch (routeName) {
    case "speech/transcribe":
      return shapeSpeechTranscribePoll(rawResult);
    case "ai/assistant-ai":
      return shapeAssistantPoll(rawResult, wrapped?.pollContext);
    case "infant-sleep/coach-plan":
      return shapeInfantSleepCoachPoll(rawResult, wrapped?.pollContext);
    case "infant-feeding/plan":
      return shapeInfantFeedingPlanPoll(rawResult, wrapped?.pollContext);
    case "routines/generate-ai": {
      const { buildRoutineGeneratePollResponse } = await import("../routes/routines.js");
      return buildRoutineGeneratePollResponse(rawResult, wrapped?.pollContext);
    }
    case "meals/ai-generate": {
      const { buildMealsAiGenerateApiBody } = await import("./meals-ai-generate-response.js");
      return buildMealsAiGenerateApiBody(
        rawResult,
        (wrapped?.pollContext ?? {}) as import("./meals-ai-generate-response.js").MealsAiGeneratePollContext,
      );
    }
    default:
      return rawResult;
  }
}

function inferLegacyRouteName(job: AiJobRecord): string | null {
  if (job.type === "openai.chat" && job.payload && typeof job.payload === "object") {
    const unwrapped = unwrapJobPayload(job.payload);
    if (unwrapped.routeName === "ai/assistant-ai") return "ai/assistant-ai";
    const ns = (unwrapped.input as { namespace?: string } | undefined)?.namespace;
    if (ns === "amy-assistant") return "ai/assistant-ai";
  }
  return null;
}

function shapeSpeechTranscribePoll(raw: unknown): { transcript: string } {
  const body = raw as { text?: string; transcript?: string };
  const text = typeof body.transcript === "string"
    ? body.transcript
    : typeof body.text === "string"
      ? body.text
      : "";
  return { transcript: text };
}

function shapeAssistantPoll(raw: unknown, pollContext: unknown): { answer: string } {
  const ctx = (pollContext ?? {}) as {
    question?: string;
    childName?: string;
    childAge?: number;
    userId?: string;
  };
  const content = (raw as { content?: string | null }).content?.trim() ?? "";
  const answer = content
    ? content
    : getParentingAdvice(ctx.question ?? "", ctx.childName, ctx.childAge);
  if (ctx.userId && ctx.question) {
    void import("../routes/ai.js")
      .then(({ persistAssistantExchange }) =>
        persistAssistantExchange(ctx.userId!, ctx.question!, answer),
      )
      .catch(() => undefined);
  }
  return { answer };
}

function shapeInfantSleepCoachPoll(raw: unknown, pollContext: unknown): Record<string, unknown> {
  const ctx = (pollContext ?? {}) as {
    userId?: string;
    childId?: number;
    context?: unknown;
    ageMonths?: number;
  };
  const plan = (raw as { plan?: unknown }).plan;
  if (ctx.userId && ctx.childId && plan) {
    void import("../routes/infant-sleep-coach.js")
      .then(({ persistInfantSleepCoachPlan }) =>
        persistInfantSleepCoachPlan(
          ctx.userId!,
          ctx.childId!,
          ctx.context,
          plan as InfantSleepCoachPlan,
        ),
      )
      .catch(() => undefined);
  }
  return {
    ok: true,
    plan,
    generatedAt: new Date().toISOString(),
    cached: false,
  };
}

function shapeInfantFeedingPlanPoll(raw: unknown, pollContext: unknown): Record<string, unknown> {
  const ctx = (pollContext ?? {}) as {
    userId?: string;
    childId?: number;
    context?: unknown;
    ageMonths?: number;
  };
  const plan = (raw as { plan?: unknown }).plan;
  if (ctx.userId && ctx.childId && plan) {
    void import("../routes/infant-feeding-plan.js")
      .then(({ persistInfantFeedingPlan }) =>
        persistInfantFeedingPlan(
          ctx.userId!,
          ctx.childId!,
          ctx.context,
          plan as InfantFeedingPlan,
          ctx.ageMonths,
        ),
      )
      .catch(() => undefined);
  }
  return {
    ok: true,
    plan,
    generatedAt: new Date().toISOString(),
    cached: false,
  };
}
