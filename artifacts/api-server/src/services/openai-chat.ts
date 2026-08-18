import { getOpenAiClient } from "./ai-runtime.js";
import {
  classifyOpenAiEmptyCompletion,
  openAiChatTemperatureField,
  resolveOpenAiChatModel,
  resolveOpenAiCompletionBudget,
} from "./openai-model-catalog.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
import { parseEnvMs } from "../lib/env.js";
import { logger } from "../lib/logger.js";

export const AI_CHAT_TIMEOUT_MS = parseEnvMs("AI_JOB_TIMEOUT_MS", 30_000);

export interface ChatCompletionParams {
  model?: string;
  messages: ChatMessage[];
  max_completion_tokens?: number;
  temperature?: number;
  response_format?:
    | { type: "json_object" }
    | {
        type: "json_schema";
        json_schema: {
          name: string;
          strict?: boolean;
          schema: Record<string, unknown>;
        };
      };
  /** When set, emits coach_generate_trace openai.* stages. */
  traceId?: string;
}

export interface ChatCompletionOutcome {
  content: string | null;
  finishReason: string | null;
  timedOut: boolean;
  error?: string;
}

/**
 * OpenAI chat with hard timeout. Never holds the HTTP connection — meant for workers.
 * Default model is LEGACY (`gpt-4o-mini`) so omitted-model jobs cannot accidentally
 * migrate high-volume structured workloads onto FAST.
 */
export async function chatCompletionWithTimeout(
  params: ChatCompletionParams,
  timeoutMs: number = AI_CHAT_TIMEOUT_MS,
): Promise<ChatCompletionOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const openaiStarted = Date.now();

  if (params.traceId) {
    void import("../lib/coach-generate-trace.js").then(({ logCoachGenerateTrace }) =>
      logCoachGenerateTrace("openai.request_started", {
        traceId: params.traceId!,
        layer: "openai",
        timeoutMs,
      }),
    );
  }

  try {
    const openai = await getOpenAiClient();
    const model = params.model ?? resolveOpenAiChatModel("legacy");
    const maxCompletionTokens = resolveOpenAiCompletionBudget({
      model,
      requested: params.max_completion_tokens,
    });
    const completion = await openai.chat.completions.create(
      {
        model,
        messages: params.messages,
        max_completion_tokens: maxCompletionTokens,
        ...openAiChatTemperatureField(model, params.temperature),
        ...(params.response_format ? { response_format: params.response_format } : {}),
      },
      { signal: controller.signal },
    );

    const choice = completion.choices[0];
    const finishReason = choice?.finish_reason ?? null;
    const content = choice?.message?.content?.trim() ?? null;
    const reasoningTokens =
      completion.usage?.completion_tokens_details?.reasoning_tokens ?? null;
    const completionTokens = completion.usage?.completion_tokens ?? null;
    const classification = classifyOpenAiEmptyCompletion({
      content,
      finishReason,
      reasoningTokens,
      completionTokens,
    });
    if (params.traceId) {
      void import("../lib/coach-generate-trace.js").then(({ logCoachGenerateTrace }) =>
        logCoachGenerateTrace("openai.request_completed", {
          traceId: params.traceId!,
          layer: "openai",
          meta: { durationMs: Date.now() - openaiStarted, finishReason },
        }),
      );
    }
    if (classification !== "ok") {
      logger.warn(
        {
          evt:
            classification === "ai_budget_exhausted"
              ? "openai.chat_budget_exhausted"
              : "openai.chat_empty",
          model,
          finishReason,
          maxCompletionTokens,
          reasoningTokens,
          completionTokens,
        },
        classification === "ai_budget_exhausted"
          ? "OpenAI chat exhausted the completion budget before visible output"
          : "OpenAI chat returned empty content",
      );
      return {
        content: null,
        finishReason,
        timedOut: false,
        error: classification,
      };
    }
    return {
      content,
      finishReason,
      timedOut: false,
    };
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    if (params.traceId) {
      void import("../lib/coach-generate-trace.js").then(({ logCoachGenerateTrace }) =>
        logCoachGenerateTrace("openai.request_completed", {
          traceId: params.traceId!,
          layer: "openai",
          meta: {
            durationMs: Date.now() - openaiStarted,
            timedOut,
            error: timedOut ? "timeout" : err instanceof Error ? err.message.slice(0, 120) : String(err),
          },
        }),
      );
    }
    if (timedOut) {
      logger.warn({ evt: "openai.chat_timeout", timeoutMs }, "OpenAI chat timed out");
      return { content: null, finishReason: null, timedOut: true, error: "timeout" };
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ evt: "openai.chat_error", message: message.slice(0, 300) }, "OpenAI chat failed");
    return { content: null, finishReason: null, timedOut: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}
