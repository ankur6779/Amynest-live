/**
 * Birth Sky AI token streaming with chunkSequence (Pack 6 Addendum A).
 */

import { getOpenAiClient } from "../ai-runtime.js";
import { logger } from "../../lib/logger.js";
import {
  classifyOpenAiEmptyCompletion,
  openAiChatTemperatureField,
  resolveOpenAiCompletionBudget,
} from "../openai-model-catalog.js";
import { BIRTH_SKY_AI_STREAM_TIMEOUT_MS } from "./ai-constants.js";
import { resolveBirthSkyModelCatalog } from "./ai-model-router.js";
import type { ChatMessage } from "../openai-chat.js";

export type StreamChunk = {
  chunkSequence: number;
  delta: string;
};

export type StreamUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

export type StreamResult =
  | {
      ok: true;
      text: string;
      modelVersion: string;
      timedOut: false;
      latencyMs: number;
      usage: StreamUsage;
    }
  | {
      ok: false;
      error: string;
      timedOut: boolean;
      text: string;
      modelVersion: string;
      latencyMs: number;
      usage: StreamUsage;
    };

/**
 * Streams OpenAI chat completions. Invokes onChunk for each delta with monotonic sequence.
 */
export async function streamBirthSkyChat(params: {
  messages: ChatMessage[];
  /** Routed model id from ai-model-router (required for intelligent routing). */
  model?: string;
  signal?: AbortSignal;
  onChunk: (chunk: StreamChunk) => void;
}): Promise<StreamResult> {
  const modelVersion = params.model?.trim() || resolveBirthSkyModelCatalog().fast;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BIRTH_SKY_AI_STREAM_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  params.signal?.addEventListener("abort", onAbort);

  let sequence = 0;
  let text = "";
  let usage: StreamUsage = { inputTokens: null, outputTokens: null };
  const started = Date.now();

  const fail = (
    error: string,
    timedOut: boolean,
  ): StreamResult => ({
    ok: false,
    error,
    timedOut,
    text,
    modelVersion,
    latencyMs: Date.now() - started,
    usage,
  });

  try {
    const openai = await getOpenAiClient();
    const maxCompletionTokens = resolveOpenAiCompletionBudget({
      model: modelVersion,
      requested: 500,
    });
    const stream = await openai.chat.completions.create(
      {
        model: modelVersion,
        messages: params.messages,
        max_completion_tokens: maxCompletionTokens,
        ...openAiChatTemperatureField(modelVersion, 0.7),
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal: controller.signal },
    );

    let finishReason: string | null = null;
    let reasoningTokens: number | null = null;
    for await (const part of stream) {
      if (controller.signal.aborted || params.signal?.aborted) {
        clearTimeout(timer);
        params.signal?.removeEventListener("abort", onAbort);
        return fail("cancelled", false);
      }
      const u = part.usage;
      if (u) {
        usage = {
          inputTokens: u.prompt_tokens ?? null,
          outputTokens: u.completion_tokens ?? null,
        };
        reasoningTokens = u.completion_tokens_details?.reasoning_tokens ?? reasoningTokens;
      }
      const choice = part.choices[0];
      if (choice?.finish_reason) finishReason = choice.finish_reason;
      const delta = choice?.delta?.content ?? "";
      if (!delta) continue;
      text += delta;
      sequence += 1;
      params.onChunk({ chunkSequence: sequence, delta });
    }

    clearTimeout(timer);
    params.signal?.removeEventListener("abort", onAbort);
    if (!text.trim()) {
      const classification = classifyOpenAiEmptyCompletion({
        content: text,
        finishReason,
        reasoningTokens,
        completionTokens: usage.outputTokens,
      });
      logger.warn(
        {
          evt:
            classification === "ai_budget_exhausted"
              ? "birth_sky.stream_budget_exhausted"
              : "birth_sky.stream_empty",
          classification,
          finishReason,
          modelVersion,
          maxCompletionTokens,
          reasoningTokens,
          completionTokens: usage.outputTokens,
        },
        classification === "ai_budget_exhausted"
          ? "Birth Sky stream exhausted the completion budget before visible output"
          : "Birth Sky stream completed without visible content",
      );
      return fail("empty", false);
    }
    return {
      ok: true,
      text,
      modelVersion,
      timedOut: false,
      latencyMs: Date.now() - started,
      usage,
    };
  } catch (err) {
    clearTimeout(timer);
    params.signal?.removeEventListener("abort", onAbort);
    const timedOut =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    if (params.signal?.aborted && !timedOut) {
      return fail("cancelled", false);
    }
    return fail(
      timedOut ? "timeout" : err instanceof Error ? err.message : "stream_error",
      timedOut,
    );
  }
}
