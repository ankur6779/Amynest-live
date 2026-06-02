import type { Response as ExpressResponse } from "express";
import { logger } from "../lib/logger.js";
import { getElevenLabsApiKey } from "../lib/env.js";
import type { SynthesizeMode } from "./ttsCacheService.js";
import { readCachedAudio } from "./ttsCacheService.js";
import { persistOpenAiTtsCache } from "./openaiTtsPersist.js";
import type { TtsGenerationContext } from "./ttsGenerate.js";
import {
  assertTtsCacheMissAllowed,
  refundTtsDailyMiss,
  recordTtsCacheHit,
  recordTtsCacheMissAndGenerated,
  TtsRateLimitedError,
  ttsRateLimitResponseBody,
} from "./ttsCostGuardService.js";

/** Fastest ElevenLabs model — lowest first-byte latency for live conversation. */
export const AMY_MODEL_ID_FLASH = "eleven_flash_v2_5";

/**
 * `optimize_streaming_latency` 0-4: higher trades a little quality for speed.
 * 3 is the sweet spot for a snappy back-and-forth without obvious artifacts.
 */
const ELEVEN_STREAM_LATENCY = 3;

const MAX_BUFFER_BYTES = 8 * 1024 * 1024;

const inflight = new Map<string, Promise<Buffer>>();

const VOICE_SETTINGS: Record<
  SynthesizeMode,
  { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }
> = {
  default: { stability: 0.5, similarity_boost: 0.75, style: 0.0, use_speaker_boost: true },
  phonics: { stability: 0.85, similarity_boost: 0.85, style: 0.0, use_speaker_boost: true },
};

export interface ElevenLabsLiveTtsParams {
  text: string;
  voiceId: string;
  modelId: string;
  mode: SynthesizeMode;
  cacheKey: string;
}

function serveCachedBuffer(res: ExpressResponse, buffer: Buffer): void {
  if (res.headersSent) return;
  res.status(200);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Length", String(buffer.byteLength));
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.end(buffer);
}

function failPlayback(res: ExpressResponse, cacheKey: string, reason: string): void {
  logger.warn({ evt: "elevenlabs.tts_stream_failed", cacheKey, reason }, "ElevenLabs TTS stream failed");
  if (!res.headersSent) {
    res.status(502).json({ error: "tts_failed" });
  } else {
    try {
      res.destroy();
    } catch {
      /* ignore */
    }
  }
}

async function readCachedBuffer(cacheKey: string): Promise<Buffer | null> {
  try {
    const cached = await readCachedAudio(cacheKey);
    if (cached?.buffer?.byteLength) return cached.buffer;
  } catch (err) {
    logger.warn(
      {
        evt: "elevenlabs.tts_cache_read_failed",
        cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "TTS cache read failed — will stream from ElevenLabs",
    );
  }
  return null;
}

/** Request ElevenLabs speech with a streaming MP3 body (low first-byte latency). */
async function fetchElevenLabsStream(params: ElevenLabsLiveTtsParams): Promise<Response> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) throw new Error("tts_missing_api_key");

  const url =
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(params.voiceId)}/stream` +
    `?output_format=mp3_44100_128&optimize_streaming_latency=${ELEVEN_STREAM_LATENCY}`;

  const started = performance.now();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text: params.text,
      model_id: params.modelId,
      voice_settings: VOICE_SETTINGS[params.mode],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    logger.error(
      {
        evt: "elevenlabs.tts_stream_upstream_error",
        status: response.status,
        durationMs: Math.round(performance.now() - started),
        detail: detail.slice(0, 300),
        voiceId: params.voiceId,
      },
      `ElevenLabs TTS stream error: HTTP ${response.status}`,
    );
    throw new Error(`elevenlabs_upstream_${response.status}`);
  }
  return response;
}

async function streamBufferToClient(
  res: ExpressResponse,
  upstream: Response,
): Promise<Buffer> {
  if (!upstream.body) throw new Error("elevenlabs_empty_body");

  res.status(200);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.setHeader("Transfer-Encoding", "chunked");

  const reader = upstream.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value?.length) continue;
    total += value.byteLength;
    if (total > MAX_BUFFER_BYTES) {
      reader.cancel().catch(() => {});
      throw new Error("elevenlabs_audio_too_large");
    }
    chunks.push(Buffer.from(value));
    if (!res.write(value)) {
      await new Promise<void>((resolve) => res.once("drain", resolve));
    }
  }
  res.end();

  const buffer = Buffer.concat(chunks);
  if (!buffer.byteLength) throw new Error("elevenlabs_empty_audio");
  return buffer;
}

function startGeneration(
  res: ExpressResponse,
  params: ElevenLabsLiveTtsParams,
  ctx?: TtsGenerationContext,
  guardPremium?: boolean,
): Promise<Buffer> {
  const existing = inflight.get(params.cacheKey);
  if (existing) return existing;

  const generation = (async (): Promise<Buffer> => {
    const upstream = await fetchElevenLabsStream(params);
    const buffer = await streamBufferToClient(res, upstream);
    void persistOpenAiTtsCache({
      cacheKey: params.cacheKey,
      text: params.text,
      voiceId: params.voiceId,
      modelId: params.modelId,
      mode: params.mode,
      buffer,
    });
    if (ctx) recordTtsCacheMissAndGenerated(ctx.userId, ctx.route, guardPremium);
    return buffer;
  })();

  inflight.set(params.cacheKey, generation);
  void generation.finally(() => {
    if (inflight.get(params.cacheKey) === generation) inflight.delete(params.cacheKey);
  });
  return generation;
}

/**
 * Cache hit → immutable MP3 from GCS/Postgres (no ElevenLabs cost).
 * Miss → live ElevenLabs stream to `res`, then best-effort GCS/DB persist so the
 * very next user (any device) is served from cache — first generation pays once.
 * Concurrent callers share one generation; followers receive the cached buffer.
 */
export async function streamElevenLabsTtsWithCache(
  res: ExpressResponse,
  params: ElevenLabsLiveTtsParams,
  ctx?: TtsGenerationContext,
): Promise<boolean> {
  const cached = await readCachedBuffer(params.cacheKey);
  if (cached) {
    if (ctx) recordTtsCacheHit(ctx.userId, ctx.route);
    serveCachedBuffer(res, cached);
    return true;
  }

  let guardPremium: boolean | undefined;
  if (ctx) {
    const guard = await assertTtsCacheMissAllowed(ctx.userId, ctx.route);
    if (!guard.ok) {
      if (!res.headersSent) {
        res.status(429).json(ttsRateLimitResponseBody(new TtsRateLimitedError(guard)));
      }
      return false;
    }
    guardPremium = guard.isPremium;
  }

  const pending = inflight.get(params.cacheKey);
  if (pending) {
    try {
      serveCachedBuffer(res, await pending);
      return true;
    } catch (err) {
      failPlayback(res, params.cacheKey, err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  try {
    await startGeneration(res, params, ctx, guardPremium);
    return true;
  } catch (err) {
    if (ctx && !(err instanceof TtsRateLimitedError)) {
      await refundTtsDailyMiss(ctx.userId, 1);
    }
    failPlayback(res, params.cacheKey, err instanceof Error ? err.message : String(err));
    return false;
  }
}
