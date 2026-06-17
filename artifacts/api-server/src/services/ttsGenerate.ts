import {
  computeTtsCacheKey,
  trySynthesizeFromCache,
  type SynthesizeMode,
} from "./ttsCacheService.js";
import { fetchOpenAiTtsStream } from "./openaiTtsService.js";
import { persistOpenAiTtsCache } from "./openaiTtsPersist.js";
import { getOpenAiTtsModel, getOpenAiTtsVoice } from "../lib/openai-tts-config.js";
import { isValidTtsPublicUrl, resolveTtsPlaybackUrl } from "./ttsAudioStore.js";
import {
  getPhonicsCacheFileName,
  getPhonemeCacheFileName,
  getCvcWordCacheFileName,
  getBlendCacheFileName,
} from "@workspace/phonics-sounds";
import { logger } from "../lib/logger.js";
import { isElevenLabsFallbackEnabled } from "../lib/env.js";
import { isPhonicsTtsRequest } from "../lib/phonics-tts-policy.js";
import { getAmyTtsModelId, getAmyTtsVoiceId } from "../lib/amy-tts-config.js";
import { synthesizeElevenLabsFallback } from "./elevenLabsFallbackService.js";
import {
  assertTtsCacheMissAllowed,
  refundTtsDailyMiss,
  recordTtsCacheHit,
  recordTtsCacheMissAndGenerated,
  TtsRateLimitedError,
} from "./ttsCostGuardService.js";

export type TtsGenerateCategory = "words" | "sentences" | "phonics";

export interface TtsGenerationContext {
  userId: string;
  route: string;
}

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
  /** When set, logged as stable GCS object stem (phonics_a_apple). */
  letterKey?: string;
  /** IPA phoneme key → phoneme_k / phoneme_æ_apple */
  phonemeKey?: string;
  /** CVC whole word → word_cat */
  cvcWord?: string;
  /** CVC blend → blend_cat */
  blendWord?: string;
}

export interface TtsGenerateResult {
  url: string;
  cached: boolean;
  cacheKey: string;
}

/**
 * OpenAI TTS with GCS/Postgres cache reuse. Single source of truth for all TTS.
 */
export async function generateOpenAiTts(
  input: TtsGenerateInput,
  ctx?: TtsGenerationContext,
): Promise<TtsGenerateResult | null> {
  const text = input.text.trim();
  if (!text) return null;

  const mode: SynthesizeMode = input.mode ?? "default";
  const phonicsOnly = isPhonicsTtsRequest({ mode, category: input.category });

  // Primary dynamic TTS for the WHOLE app (incl. Speech Coach) is ElevenLabs
  // Flash v2.5 — cache-first, stored once in GCS and reused by every user.
  // OpenAI stays as the safety net so audio never disappears if ElevenLabs
  // is unavailable. Rate-limit errors propagate (don't double-try OpenAI).
  if (isElevenLabsFallbackEnabled()) {
    try {
      const el = await synthesizeElevenLabsFallback(
        text,
        {
          voiceId: getAmyTtsVoiceId(),
          modelId: getAmyTtsModelId(),
          mode,
        },
        ctx,
      );
      if (el && isValidTtsPublicUrl(el.audioUrl)) {
        return { url: el.audioUrl, cached: el.cached, cacheKey: el.cacheKey };
      }
    } catch (err) {
      if (err instanceof TtsRateLimitedError) throw err;
      logger.warn(
        {
          evt: "tts.elevenlabs_primary_fallback_openai",
          message: err instanceof Error ? err.message : String(err),
        },
        "ElevenLabs Flash failed — falling back to OpenAI TTS",
      );
    }
  }

  // ElevenLabs-only policy for phonics: never serve OpenAI for phonics, neither
  // a freshly synthesized clip nor a previously cached OpenAI clip. Fail safe
  // (no audio) rather than playing a second, inconsistent voice to the child.
  if (phonicsOnly) {
    logger.warn(
      { evt: "tts.phonics_elevenlabs_only_blocked_openai", mode, category: input.category },
      "Phonics TTS is ElevenLabs-only — refusing OpenAI fallback",
    );
    return null;
  }

  const voiceId = (input.voice?.trim() || getAmyTtsVoiceId()).slice(0, 64);
  const modelId = getAmyTtsModelId();

  const cacheHit = await trySynthesizeFromCache(text, { voiceId, modelId, mode });
  if (cacheHit && isValidTtsPublicUrl(cacheHit.audioUrl)) {
    const url = resolveTtsPlaybackUrl(cacheHit.cacheKey) ?? cacheHit.audioUrl;
    if (ctx) {
      recordTtsCacheHit(ctx.userId, ctx.route);
    }
    return { url, cached: true, cacheKey: cacheHit.cacheKey };
  }

  let guardPremium: boolean | undefined;
  if (ctx) {
    const guard = await assertTtsCacheMissAllowed(ctx.userId, ctx.route);
    if (!guard.ok) {
      throw new TtsRateLimitedError(guard);
    }
    guardPremium = guard.isPremium;
  }

  const cacheKey = computeTtsCacheKey(text, voiceId, modelId, mode);
  try {
    const upstream = await fetchOpenAiTtsStream(text, { mode });
    if (!upstream.ok || !upstream.body) {
      if (ctx) await refundTtsDailyMiss(ctx.userId, 1);
      return null;
    }

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
    if (!buffer.byteLength) {
      if (ctx) await refundTtsDailyMiss(ctx.userId, 1);
      return null;
    }

    await persistOpenAiTtsCache({
      cacheKey,
      text,
      voiceId,
      modelId,
      mode,
      buffer,
    });

    const url = resolveTtsPlaybackUrl(cacheKey);
    if (ctx) {
      recordTtsCacheMissAndGenerated(ctx.userId, ctx.route, guardPremium);
    }
    logger.info(
      {
        evt: "tts.generate",
        cacheKey,
        category: input.category ?? "words",
        objectName: input.phonemeKey
          ? `tts/phonics/${getPhonemeCacheFileName(input.phonemeKey)}.mp3`
          : input.blendWord
            ? `tts/phonics/${getBlendCacheFileName(input.blendWord)}.mp3`
            : input.cvcWord
              ? `tts/phonics/${getCvcWordCacheFileName(input.cvcWord)}.mp3`
              : input.letterKey
                ? `tts/phonics/${getPhonicsCacheFileName(input.letterKey)}.mp3`
                : ttsCategoryObjectName(input.category ?? "words", text),
        cached: false,
        userId: ctx?.userId,
      },
      "OpenAI TTS generated and cached",
    );

    return { url, cached: false, cacheKey };
  } catch (err) {
    if (ctx && !(err instanceof TtsRateLimitedError)) {
      await refundTtsDailyMiss(ctx.userId, 1);
    }
    throw err;
  }
}
