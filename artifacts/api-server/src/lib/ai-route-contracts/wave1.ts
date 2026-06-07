import { AskAssistantResponse } from "@workspace/api-zod";
import type { AiRouteContract } from "./types.js";
import { getParentingAdvice } from "../parenting-faq.js";

export type SpeechTranscribeWorker = { text?: string };
export type SpeechTranscribeApi = { transcript: string };

export const speechTranscribeContract: AiRouteContract<
  Record<string, never>,
  SpeechTranscribeWorker,
  SpeechTranscribeApi
> = {
  routeName: "speech/transcribe",
  jobType: "speech.transcribe",
  wave: 1,
  finalize(worker) {
    const text = typeof worker.text === "string" ? worker.text : "";
    return { transcript: text };
  },
};

export type AssistantContext = {
  question: string;
  childName?: string;
  childAge?: number;
  userId?: string;
};

export type AssistantWorker = { content?: string | null; timedOut?: boolean };

export const assistantAiContract: AiRouteContract<
  AssistantContext,
  AssistantWorker,
  { answer: string }
> = {
  routeName: "ai/assistant-ai",
  jobType: "openai.chat",
  wave: 1,
  finalize(worker, ctx) {
    const aiAnswer = worker.content?.trim();
    const answer = aiAnswer
      ? aiAnswer
      : getParentingAdvice(ctx.question, ctx.childName, ctx.childAge);
    return AskAssistantResponse.parse({ answer });
  },
  async afterFinalize(api, ctx, meta) {
    if (!ctx.userId || !ctx.question) return;
    const { persistAssistantExchange } = await import("../../routes/ai.js");
    await persistAssistantExchange(ctx.userId, ctx.question, api.answer);
  },
};
