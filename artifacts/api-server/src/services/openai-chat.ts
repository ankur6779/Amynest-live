import { getOpenAiClient } from "./ai-runtime.js";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};
import { logger } from "../lib/logger.js";

export const AI_CHAT_TIMEOUT_MS = Number(process.env.AI_JOB_TIMEOUT_MS ?? "10_000");

export interface ChatCompletionParams {
  model?: string;
  messages: ChatMessage[];
  max_completion_tokens?: number;
  temperature?: number;
  response_format?: { type: "json_object" };
}

export interface ChatCompletionOutcome {
  content: string | null;
  finishReason: string | null;
  timedOut: boolean;
  error?: string;
}

/**
 * OpenAI chat with hard timeout. Never holds the HTTP connection — meant for workers.
 */
export async function chatCompletionWithTimeout(
  params: ChatCompletionParams,
  timeoutMs: number = AI_CHAT_TIMEOUT_MS,
): Promise<ChatCompletionOutcome> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const openai = await getOpenAiClient();
    const completion = await openai.chat.completions.create(
      {
        model: params.model ?? "gpt-4o-mini",
        messages: params.messages,
        max_completion_tokens: params.max_completion_tokens ?? 600,
        ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
        ...(params.response_format ? { response_format: params.response_format } : {}),
      },
      { signal: controller.signal },
    );

    const choice = completion.choices[0];
    return {
      content: choice?.message?.content?.trim() ?? null,
      finishReason: choice?.finish_reason ?? null,
      timedOut: false,
    };
  } catch (err) {
    const timedOut =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
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
