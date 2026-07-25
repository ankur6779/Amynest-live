/**
 * Birth Sky AI token streaming with chunkSequence (Pack 6 Addendum A).
 */

import { getOpenAiClient } from "../ai-runtime.js";
import {
  BIRTH_SKY_AI_MODEL_VERSION,
  BIRTH_SKY_AI_STREAM_TIMEOUT_MS,
} from "./ai-constants.js";
import type { ChatMessage } from "../openai-chat.js";

export type StreamChunk = {
  chunkSequence: number;
  delta: string;
};

export type StreamResult =
  | { ok: true; text: string; modelVersion: string; timedOut: false }
  | { ok: false; error: string; timedOut: boolean; text: string; modelVersion: string };

/**
 * Streams OpenAI chat completions. Invokes onChunk for each delta with monotonic sequence.
 */
export async function streamBirthSkyChat(params: {
  messages: ChatMessage[];
  signal?: AbortSignal;
  onChunk: (chunk: StreamChunk) => void;
}): Promise<StreamResult> {
  const modelVersion = BIRTH_SKY_AI_MODEL_VERSION;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BIRTH_SKY_AI_STREAM_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  params.signal?.addEventListener("abort", onAbort);

  let sequence = 0;
  let text = "";

  try {
    const openai = await getOpenAiClient();
    const stream = await openai.chat.completions.create(
      {
        model: modelVersion,
        messages: params.messages,
        max_completion_tokens: 500,
        temperature: 0.7,
        stream: true,
      },
      { signal: controller.signal },
    );

    for await (const part of stream) {
      if (controller.signal.aborted || params.signal?.aborted) {
        clearTimeout(timer);
        params.signal?.removeEventListener("abort", onAbort);
        return { ok: false, error: "cancelled", timedOut: false, text, modelVersion };
      }
      const delta = part.choices[0]?.delta?.content ?? "";
      if (!delta) continue;
      text += delta;
      sequence += 1;
      params.onChunk({ chunkSequence: sequence, delta });
    }

    clearTimeout(timer);
    params.signal?.removeEventListener("abort", onAbort);
    if (!text.trim()) {
      return { ok: false, error: "empty", timedOut: false, text, modelVersion };
    }
    return { ok: true, text, modelVersion, timedOut: false };
  } catch (err) {
    clearTimeout(timer);
    params.signal?.removeEventListener("abort", onAbort);
    const timedOut =
      err instanceof Error &&
      (err.name === "AbortError" || err.message.includes("aborted"));
    if (params.signal?.aborted && !timedOut) {
      return { ok: false, error: "cancelled", timedOut: false, text, modelVersion };
    }
    return {
      ok: false,
      error: timedOut ? "timeout" : err instanceof Error ? err.message : "stream_error",
      timedOut,
      text,
      modelVersion,
    };
  }
}
