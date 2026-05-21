import {
  getOpenAiApiKeyForFetch,
  getOpenAiAudioSpeechUrl,
} from "../lib/env.js";
import {
  getOpenAiTtsInstructions,
  getOpenAiTtsModel,
  getOpenAiTtsVoice,
  type OpenAiTtsMode,
} from "../lib/openai-tts-config.js";
import { logger } from "../lib/logger.js";
import type { SynthesizeMode } from "./ttsCacheService.js";

export type OpenAiTtsStreamOptions = {
  mode?: SynthesizeMode;
};

/** Request OpenAI speech with a streaming MP3 body (no local buffering). */
export async function fetchOpenAiTtsStream(
  text: string,
  options: OpenAiTtsStreamOptions = {},
): Promise<Response> {
  const input = text.trim();
  if (!input) throw new Error("tts_empty_text");

  const apiKey = getOpenAiApiKeyForFetch();
  if (!apiKey) {
    throw new Error("tts_missing_openai_api_key");
  }

  const mode: OpenAiTtsMode = options.mode ?? "default";
  const model = getOpenAiTtsModel();
  const voice = getOpenAiTtsVoice();
  const instructions = getOpenAiTtsInstructions(mode);

  const started = performance.now();
  logger.info(
    {
      evt: "openai.tts_request_start",
      charCount: input.length,
      model,
      voice,
      mode,
    },
    "OpenAI TTS request start",
  );

  const response = await fetch(getOpenAiAudioSpeechUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      model,
      voice,
      input,
      instructions,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error(
      {
        evt: "openai.tts_error",
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        detail: detail.slice(0, 300),
      },
      `OpenAI TTS error: HTTP ${response.status}`,
    );
    throw new Error(`tts_openai_upstream_${response.status}`);
  }

  logger.info(
    {
      evt: "openai.tts_response_ok",
      durationMs: Math.round(performance.now() - started),
    },
    "OpenAI TTS response streaming",
  );

  return response;
}
