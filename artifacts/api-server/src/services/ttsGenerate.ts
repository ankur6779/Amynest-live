import {
  AMY_MODEL_ID_DEFAULT,
  AMY_VOICE_ID_DEFAULT,
  computeTtsCacheKey,
  trySynthesizeFromCache,
  type SynthesizeMode,
} from "./elevenLabsService.js";
import { fetchOpenAiTtsStream } from "./openaiTtsService.js";
import { persistOpenAiTtsCache } from "./openaiTtsPersist.js";
import { getOpenAiTtsModel, getOpenAiTtsVoice } from "../lib/openai-tts-config.js";
import { isValidTtsPublicUrl, resolveTtsPlaybackUrl } from "./ttsAudioStore.js";
import { logger } from "../lib/logger.js";

export type TtsGenerateCategory = "words" | "sentences" | "phonics";

function slugifyTtsText(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.length > 0 ? slug.slice(0, 80) : "audio";
}

/** GCS-friendly object name under /tts/{category}/ */
export function ttsCategoryObjectName(category: TtsGenerateCategory, text: string): string {
  const prefix =
    category === "phonics" ? "phonics" : category === "sentences" ? "sentences" : "words";
  return `tts/${prefix}/${prefix}_${slugifyTtsText(text)}.mp3`;
}

export interface TtsGenerateInput {
  text: string;
  voice?: string;
  speed?: number;
  mode?: SynthesizeMode;
  category?: TtsGenerateCategory;
}

export interface TtsGenerateResult {
  url: string;
  cached: boolean;
  cacheKey: string;
}

/**
 * OpenAI TTS with GCS/Postgres cache reuse. Used by POST /api/tts/generate.
 * ElevenLabs is not called from this path.
 */
export async function generateOpenAiTts(
  input: TtsGenerateInput,
): Promise<TtsGenerateResult | null> {
  const text = input.text.trim();
  if (!text) return null;

  const mode: SynthesizeMode = input.mode ?? "default";
  const voiceId = (input.voice?.trim() || getOpenAiTtsVoice() || AMY_VOICE_ID_DEFAULT).slice(0, 64);
  const modelId = getOpenAiTtsModel() || AMY_MODEL_ID_DEFAULT;

  const cacheHit = await trySynthesizeFromCache(text, { voiceId, modelId, mode });
  if (cacheHit && isValidTtsPublicUrl(cacheHit.audioUrl)) {
    const url = resolveTtsPlaybackUrl(cacheHit.cacheKey) ?? cacheHit.audioUrl;
    return { url, cached: true, cacheKey: cacheHit.cacheKey };
  }

  const cacheKey = computeTtsCacheKey(text, voiceId, modelId, mode);
  const upstream = await fetchOpenAiTtsStream(text, { mode });
  if (!upstream.ok || !upstream.body) return null;

  const reader = upstream.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const max = 8 * 1024 * 1024;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > max) throw new Error("tts_audio_too_large");
      chunks.push(value);
    }
  }
  const buffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  if (!buffer.byteLength) return null;

  await persistOpenAiTtsCache({
    cacheKey,
    text,
    voiceId,
    modelId,
    mode,
    buffer,
  });

  const url = resolveTtsPlaybackUrl(cacheKey);
  logger.info(
    {
      evt: "tts.generate",
      cacheKey,
      category: input.category ?? "words",
      objectName: ttsCategoryObjectName(input.category ?? "words", text),
      cached: false,
    },
    "OpenAI TTS generated and cached",
  );

  return { url, cached: false, cacheKey };
}
