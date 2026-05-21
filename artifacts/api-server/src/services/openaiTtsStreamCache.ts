import type { Response as ExpressResponse } from "express";
import { logger } from "../lib/logger.js";
import type { SynthesizeMode } from "./ttsCacheService.js";
import { readCachedAudio } from "./ttsCacheService.js";
import { fetchOpenAiTtsStream } from "./openaiTtsService.js";
import { persistOpenAiTtsCache } from "./openaiTtsPersist.js";

export interface OpenAiLiveTtsParams {
  text: string;
  voiceId: string;
  modelId: string;
  mode: SynthesizeMode;
  cacheKey: string;
}

const openAiInflight = new Map<string, Promise<Buffer>>();

const MAX_BUFFER_BYTES = 8 * 1024 * 1024;

function serveCachedBuffer(res: ExpressResponse, buffer: Buffer, immutable: boolean): void {
  if (res.headersSent) return;
  res.status(200);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Length", String(buffer.byteLength));
  res.setHeader(
    "Cache-Control",
    immutable ? "public, max-age=31536000, immutable" : "no-cache, no-store",
  );
  res.end(buffer);
}

function failPlayback(res: ExpressResponse, cacheKey: string, reason: string): void {
  logger.warn({ evt: "openai.tts_playback_failed", cacheKey, reason }, "OpenAI TTS playback failed");
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
        evt: "openai.tts_cache_read_failed",
        cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "TTS cache read failed — will stream from OpenAI",
    );
  }
  return null;
}

async function streamBufferToClient(
  res: ExpressResponse,
  upstream: Response,
  cacheKey: string,
): Promise<Buffer> {
  if (!upstream.body) throw new Error("openai_empty_body");

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
      throw new Error("openai_audio_too_large");
    }
    chunks.push(Buffer.from(value));
    if (!res.write(value)) {
      await new Promise<void>((resolve) => res.once("drain", resolve));
    }
  }
  res.end();

  const buffer = Buffer.concat(chunks);
  if (!buffer.byteLength) throw new Error("openai_empty_audio");
  return buffer;
}

function startOpenAiGeneration(
  res: ExpressResponse,
  params: OpenAiLiveTtsParams,
): Promise<Buffer> {
  const existing = openAiInflight.get(params.cacheKey);
  if (existing) return existing;

  const generation = (async (): Promise<Buffer> => {
    const upstream = await fetchOpenAiTtsStream(params.text, { mode: params.mode });
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      logger.warn(
        {
          evt: "openai.tts_upstream_error",
          cacheKey: params.cacheKey,
          status: upstream.status,
          detail: detail.slice(0, 200),
        },
        "OpenAI TTS upstream error",
      );
      throw new Error(`openai_upstream_${upstream.status}`);
    }

    const buffer = await streamBufferToClient(res, upstream, params.cacheKey);
    void persistOpenAiTtsCache({
      cacheKey: params.cacheKey,
      text: params.text,
      voiceId: params.voiceId,
      modelId: params.modelId,
      mode: params.mode,
      buffer,
    });
    return buffer;
  })();

  openAiInflight.set(params.cacheKey, generation);
  void generation.finally(() => {
    if (openAiInflight.get(params.cacheKey) === generation) {
      openAiInflight.delete(params.cacheKey);
    }
  });

  return generation;
}

/**
 * Cache hit → immutable MP3 from GCS/Postgres.
 * Miss → live OpenAI stream to `res`, then best-effort GCS/DB persist (never throws).
 * Concurrent callers share one generation; followers receive the cached buffer.
 */
export async function streamOpenAiTtsWithCache(
  res: ExpressResponse,
  params: OpenAiLiveTtsParams,
): Promise<boolean> {
  const cached = await readCachedBuffer(params.cacheKey);
  if (cached) {
    serveCachedBuffer(res, cached, true);
    return true;
  }

  const inflight = openAiInflight.get(params.cacheKey);
  if (inflight) {
    try {
      const buffer = await inflight;
      serveCachedBuffer(res, buffer, true);
      return true;
    } catch (err) {
      failPlayback(res, params.cacheKey, err instanceof Error ? err.message : String(err));
      return false;
    }
  }

  try {
    await startOpenAiGeneration(res, params);
    return true;
  } catch (err) {
    failPlayback(res, params.cacheKey, err instanceof Error ? err.message : String(err));
    return false;
  }
}
