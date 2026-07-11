import type { AiJobRecord } from "../queue/types.js";
import { unwrapJobPayload } from "../queue/ai-job-payload.js";
import { getParentingAdvice } from "./parenting-faq.js";
import type { InfantSleepCoachPlan } from "./infant-sleep-prompts.js";
import type { InfantFeedingPlan } from "./infant-feeding-prompts.js";

/** Map raw worker results to the same API shapes as inline `buildSyncBody` (P0 cutover). */
export async function shapePollApiResult(
  job: AiJobRecord,
  rawResult: unknown,
  opts?: { skipSideEffects?: boolean },
): Promise<unknown> {
  if (rawResult === undefined || rawResult === null) return rawResult;

  const skipSideEffects = opts?.skipSideEffects === true;
  const wrapped = job.payload ? unwrapJobPayload(job.payload) : null;
  const routeName = wrapped?.routeName ?? inferLegacyRouteName(job);

  switch (routeName) {
    case "speech/transcribe":
      return shapeSpeechTranscribePoll(rawResult);
    case "ai/assistant-ai":
      return shapeAssistantPoll(rawResult, wrapped?.pollContext, skipSideEffects);
    case "ai/ai-tutor": {
      const { finalizeAiTutorChatResult } = await import("../routes/ai-tutor.js");
      const ctx = (wrapped?.pollContext ?? {}) as import("../routes/ai-tutor.js").AiTutorPollContext;
      return finalizeAiTutorChatResult(rawResult, ctx, { skipSideEffects });
    }
    case "infant-sleep/coach-plan":
      return shapeInfantSleepCoachPoll(rawResult, wrapped?.pollContext, skipSideEffects);
    case "infant-feeding/plan":
      return shapeInfantFeedingPlanPoll(rawResult, wrapped?.pollContext, skipSideEffects);
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
    case "ai-coach/generate":
    case "ai-coach/initial": {
      const { buildCoachGenerateApiBody, runCoachGenerateSideEffects } = await import(
        "./coach-generate-response.js"
      );
      const ctx = (wrapped?.pollContext ?? {}) as import("./coach-generate-response.js").CoachGeneratePollContext;
      const body = buildCoachGenerateApiBody(rawResult, ctx);
      if (!skipSideEffects && ctx.userId) {
        void runCoachGenerateSideEffects(body, ctx);
      }
      return body;
    }
    case "tts/generate":
    case "tts/synthesize":
      return shapeTtsGeneratePoll(rawResult);
    case "worksheet-studio/generate": {
      const job = rawResult as {
        document?: unknown;
        source?: string;
        usedFallback?: boolean;
        qualityScore?: number;
        retryCount?: number;
        attemptCount?: number;
        schemaFailureCount?: number;
        fallbackReason?: string;
        health?: unknown;
        pipelineAudit?: unknown;
        rawResponses?: unknown;
      };
      return {
        document: job.document,
        source: job.source,
        usedFallback: job.usedFallback,
        qualityScore: job.qualityScore,
        retryCount: job.retryCount,
        attemptCount: job.attemptCount,
        schemaFailureCount: job.schemaFailureCount,
        fallbackReason: job.fallbackReason,
        health: job.health,
        pipelineAudit: job.pipelineAudit,
        rawResponses: process.env.NODE_ENV === "production" ? undefined : job.rawResponses,
      };
    }
    case "learning-load-more/smart-study":
    case "learning-load-more/olympiad":
    case "learning-load-more/spelling":
    case "learning-load-more/smart-math-tricks":
    case "learning-load-more/phonics":
    case "learning-load-more/life-skills": {
      const { finalizeLearningLoadMorePoll } = await import("../services/learningLoadMoreService.js");
      return finalizeLearningLoadMorePoll(rawResult, wrapped?.pollContext, { skipSideEffects });
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
    if (typeof ns === "string" && ns.startsWith("ai-tutor:")) return "ai/ai-tutor";
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

function shapeAssistantPoll(
  raw: unknown,
  pollContext: unknown,
  skipSideEffects: boolean,
): { answer: string } {
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
  if (!skipSideEffects && ctx.userId && ctx.question) {
    void import("../routes/ai.js")
      .then(({ persistAssistantExchange }) =>
        persistAssistantExchange(ctx.userId!, ctx.question!, answer),
      )
      .catch(() => undefined);
  }
  return { answer };
}

function shapeInfantSleepCoachPoll(
  raw: unknown,
  pollContext: unknown,
  skipSideEffects: boolean,
): Record<string, unknown> {
  const ctx = (pollContext ?? {}) as {
    userId?: string;
    childId?: number;
    context?: unknown;
    ageMonths?: number;
  };
  const plan = (raw as { plan?: unknown }).plan;
  if (!skipSideEffects && ctx.userId && ctx.childId && plan) {
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

function shapeInfantFeedingPlanPoll(
  raw: unknown,
  pollContext: unknown,
  skipSideEffects: boolean,
): Record<string, unknown> {
  const ctx = (pollContext ?? {}) as {
    userId?: string;
    childId?: number;
    context?: unknown;
    ageMonths?: number;
  };
  const plan = (raw as { plan?: unknown }).plan;
  if (!skipSideEffects && ctx.userId && ctx.childId && plan) {
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

function shapeTtsGeneratePoll(raw: unknown): {
  ok: true;
  url?: string;
  audioUrl?: string;
  cacheKey?: string;
  cached?: boolean;
  success?: boolean;
  charCount?: number;
  contentType?: string;
} {
  const body = raw as {
    cacheKey?: string;
    audioUrl?: string;
    cached?: boolean;
    charCount?: number;
    contentType?: string;
  };
  return {
    ok: true,
    success: true,
    url: body.audioUrl,
    audioUrl: body.audioUrl,
    cacheKey: body.cacheKey,
    cached: body.cached,
    charCount: body.charCount,
    contentType: body.contentType ?? "audio/mpeg",
  };
}
