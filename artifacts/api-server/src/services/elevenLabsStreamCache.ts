import type { Response as ExpressResponse } from "express";
import { logger } from "../lib/logger.js";
import {
  getElevenLabsApiKey,
  isElevenLabsFallbackEnabled,
  parseEnvMs,
} from "../lib/env.js";
import { fetchWithTimeout } from "../utils/fetch-with-timeout.js";
import {
  AMY_TTS_OUTPUT_FORMAT,
  AMY_TTS_STREAM_LATENCY,
  getAmyTtsModelId,
  getAmyTtsVoiceId,
} from "../lib/amy-tts-config.js";
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
import { recordTtsLatencySample } from "./ttsLatencyMetrics.js";
import { VOICE_SETTINGS } from "./elevenLabsVoiceSettings.js";

export interface ElevenLabsLiveTtsParams {
  text: string;
  voiceId: string;
  modelId: string;
  mode: SynthesizeMode;
  cacheKey: string;
}

const MAX_BUFFER_BYTES = 8 * 1024 * 1024;
const TTS_ELEVENLABS_TIMEOUT_MS = 5_000;
const CHUNK_WRITE_BYTES = 4096;

const elevenInflight = new Map<string, Promise<Buffer>>();

function buildElevenLabsStreamUrl(voiceId: string): string {
  const params = new URLSearchParams({
    output_format: AMY_TTS_OUTPUT_FORMAT,
    optimize_streaming_latency: String(AMY_TTS_STREAM_LATENCY),
  });
  return `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}/stream?${params}`;
}

function serveBufferChunked(res: ExpressResponse, buffer: Buffer, immutable: boolean): void {
  if (res.headersSent) return;
  res.status(200);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader(
    "Cache-Control",
    immutable ? "public, max-age=31536000, immutable" : "no-cache, no-store",
  );
  res.setHeader("Transfer-Encoding", "chunked");

  let offset = 0;
  while (offset < buffer.byteLength) {
    const end = Math.min(offset + CHUNK_WRITE_BYTES, buffer.byteLength);
    if (!res.write(buffer.subarray(offset, end))) break;
    offset = end;
  }
  res.end();
}

async function readCachedBuffer(cacheKey: string): Promise<Buffer | null> {
  try {
    const cached = await readCachedAudio(cacheKey);
    if (cached?.buffer?.byteLength) return cached.buffer;
  } catch {
    /* miss */
  }
  return null;
}

async function streamUpstreamToClient(
  res: ExpressResponse,
  upstream: Response,
  cacheKey: string,
): Promise<Buffer> {
  if (!upstream.body) throw new Error("elevenlabs_empty_body");

  if (!res.headersSent) {
    res.status(200);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-cache, no-store");
    res.setHeader("Transfer-Encoding", "chunked");
  }

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
    const buf = Buffer.from(value);
    chunks.push(buf);
    if (!res.write(buf)) {
      await new Promise<void>((resolve) => res.once("drain", resolve));
    }
  }
  res.end();

  const buffer = Buffer.concat(chunks);
  if (!buffer.byteLength) throw new Error("elevenlabs_empty_audio");
  logger.info(
    { evt: "elevenlabs.stream_complete", cacheKey, bytes: buffer.byteLength },
    "ElevenLabs stream complete",
  );
  return buffer;
}

async function fetchElevenLabsStream(
  text: string,
  voiceId: string,
  modelId: string,
  mode: SynthesizeMode,
): Promise<Response> {
  const apiKey = getElevenLabsApiKey();
  if (!apiKey) throw new Error("tts_missing_api_key");

  const fetchTimeoutMs = Math.min(
    TTS_ELEVENLABS_TIMEOUT_MS,
    parseEnvMs("AI_JOB_TIMEOUT_MS", 30_000),
  );

  return fetchWithTimeout(buildElevenLabsStreamUrl(voiceId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
      "xi-api-key": apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: VOICE_SETTINGS[mode],
    }),
    timeoutMs: fetchTimeoutMs,
  });
}

function startElevenLabsGeneration(
  res: ExpressResponse,
  params: ElevenLabsLiveTtsParams,
  ctx?: TtsGenerationContext,
  guardPremium?: boolean,
): Promise<Buffer> {
  const existing = elevenInflight.get(params.cacheKey);
  if (existing) return existing;

  const voiceId = params.voiceId.trim() || getAmyTtsVoiceId();
  const modelId = params.modelId.trim() || getAmyTtsModelId();
  const genStarted = performance.now();

  const generation = (async (): Promise<Buffer> => {
    const upstream = await fetchElevenLabsStream(params.text, voiceId, modelId, params.mode);
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      throw new Error(`elevenlabs_upstream_${upstream.status}:${detail.slice(0, 120)}`);
    }

    const buffer = await streamUpstreamToClient(res, upstream, params.cacheKey);
    void persistOpenAiTtsCache({
      cacheKey: params.cacheKey,
      text: params.text,
      voiceId,
      modelId,
      mode: params.mode,
      buffer,
    });
    if (ctx) {
      recordTtsCacheMissAndGenerated(ctx.userId, ctx.route, guardPremium);
    }
    recordTtsLatencySample({
      route: ctx?.route ?? "tts/stream",
      provider: "elevenlabs",
      cacheHit: false,
      generationMs: Math.round(performance.now() - genStarted),
      firstAudioMs: Math.round(performance.now() - genStarted),
      streaming: true,
      modelId,
      voiceId,
      charCount: params.text.length,
    });
    return buffer;
  })();

  elevenInflight.set(params.cacheKey, generation);
  void generation.finally(() => {
    if (elevenInflight.get(params.cacheKey) === generation) {
      elevenInflight.delete(params.cacheKey);
    }
  });

  return generation;
}

function failPlayback(res: ExpressResponse, reason: string): void {
  logger.warn({ evt: "elevenlabs.stream_failed", reason }, "ElevenLabs stream failed");
  if (!res.headersSent) {
    res.status(502).json({ error: "tts_stream_failed" });
  } else {
    try {
      res.destroy();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Cache hit → chunked MP3 for fast TTFA.
 * Miss → live ElevenLabs `/stream` piped to client, then GCS persist.
 * Concurrent callers share one generation; followers receive the cached buffer.
 */
export async function streamElevenLabsTtsWithCache(
  res: ExpressResponse,
  params: ElevenLabsLiveTtsParams,
  ctx?: TtsGenerationContext,
): Promise<boolean> {
  if (!isElevenLabsFallbackEnabled()) return false;

  const startedAt = performance.now();
  const voiceId = params.voiceId.trim() || getAmyTtsVoiceId();
  const modelId = params.modelId.trim() || getAmyTtsModelId();

  if (!res.headersSent) res.setHeader("X-TTS-Cache-Key", params.cacheKey);

  const cached = await readCachedBuffer(params.cacheKey);
  if (cached) {
    if (ctx) recordTtsCacheHit(ctx.userId, ctx.route);
    serveBufferChunked(res, cached, true);
    recordTtsLatencySample({
      route: ctx?.route ?? "tts/stream",
      provider: "cache",
      cacheHit: true,
      firstAudioMs: Math.round(performance.now() - startedAt),
      streaming: true,
      modelId,
      voiceId,
      charCount: params.text.length,
    });
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

  const inflight = elevenInflight.get(params.cacheKey);
  if (inflight) {
    try {
      const buffer = await inflight;
      serveBufferChunked(res, buffer, true);
      if (ctx) recordTtsCacheHit(ctx.userId, ctx.route);
      return true;
    } catch (err) {
      failPlayback(res, err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  try {
    await startElevenLabsGeneration(res, params, ctx, guardPremium);
    return true;
  } catch (err) {
    if (ctx && !(err instanceof TtsRateLimitedError)) {
      await refundTtsDailyMiss(ctx.userId, 1);
    }
    failPlayback(res, err instanceof Error ? err.message : String(err));
    return false;
  }
}
