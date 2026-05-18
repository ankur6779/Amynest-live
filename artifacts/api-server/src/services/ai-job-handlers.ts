import { synthesize, type SynthesizeOptions } from "./elevenLabsService.js";
import type { ChatMessage } from "./openai-chat.js";
import { chatCompletionWithTimeout, AI_CHAT_TIMEOUT_MS } from "./openai-chat.js";
import {
  getPromptCache,
  promptCacheKey,
  setPromptCache,
} from "../utils/ai-prompt-cache.js";
import { logger } from "../lib/logger.js";

export interface OpenAiChatPayload {
  namespace: string;
  messages: ChatMessage[];
  model?: string;
  max_completion_tokens?: number;
  temperature?: number;
  json?: boolean;
}

export interface TtsSynthesizePayload {
  text: string;
  options?: SynthesizeOptions;
}

export async function runAiJobHandler(
  type: string,
  payload: unknown,
): Promise<unknown> {
  switch (type) {
    case "openai.chat":
    case "openai.chat_json":
      return handleOpenAiChat(payload as OpenAiChatPayload, type === "openai.chat_json");
    case "tts.synthesize":
      return handleTtsSynthesize(payload as TtsSynthesizePayload);
    default:
      throw new Error(`unknown_job_type:${type}`);
  }
}

async function handleOpenAiChat(
  payload: OpenAiChatPayload,
  jsonMode: boolean,
): Promise<{ content: string | null; timedOut: boolean; cached: boolean }> {
  const cacheKey = promptCacheKey(payload.namespace, {
    messages: payload.messages,
    model: payload.model,
    json: jsonMode,
  });
  const cached = getPromptCache<{ content: string | null }>(cacheKey);
  if (cached) {
    return { content: cached.content, timedOut: false, cached: true };
  }

  const outcome = await chatCompletionWithTimeout(
    {
      model: payload.model,
      messages: payload.messages,
      max_completion_tokens: payload.max_completion_tokens,
      temperature: payload.temperature,
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    },
    AI_CHAT_TIMEOUT_MS,
  );

  if (outcome.content && !outcome.timedOut) {
    setPromptCache(cacheKey, { content: outcome.content });
  }

  return {
    content: outcome.content,
    timedOut: outcome.timedOut,
    cached: false,
  };
}

async function handleTtsSynthesize(payload: TtsSynthesizePayload): Promise<{
  cacheKey: string;
  audioUrl: string;
  contentType: string;
  charCount: number;
  cached: boolean;
}> {
  const result = await synthesize(payload.text, payload.options ?? {});
  logger.info(
    {
      evt: "ai_job.tts_done",
      cacheKey: result.cacheKey,
      cached: result.cached,
      charCount: result.charCount,
    },
    "TTS job completed",
  );
  return {
    cacheKey: result.cacheKey,
    audioUrl: result.audioUrl,
    contentType: result.contentType,
    charCount: result.charCount,
    cached: result.cached,
  };
}
