import type { Response as ExpressResponse } from "express";
import { getTtsProvider, isElevenLabsTtsEnabled } from "../lib/env.js";
import { logger } from "../lib/logger.js";
import {
  fetchElevenLabsTtsStream,
  type SynthesizeMode,
} from "./elevenLabsService.js";
import { fetchOpenAiTtsStream } from "./openaiTtsService.js";
import { pipeFetchAudioToExpress } from "./ttsStreamResponse.js";

export interface LiveTtsParams {
  text: string;
  voiceId: string;
  modelId: string;
  mode: SynthesizeMode;
  cacheKey: string;
}

async function streamUpstreamToClient(
  res: ExpressResponse,
  upstream: Response,
  cacheKey: string,
  source: string,
): Promise<boolean> {
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    logger.warn(
      {
        evt: "tts.live_upstream_error",
        source,
        cacheKey,
        status: upstream.status,
        detail: detail.slice(0, 200),
      },
      "TTS live upstream returned error",
    );
    return false;
  }
  await pipeFetchAudioToExpress(res, upstream, { cacheKey, source });
  return true;
}

/** Stream OpenAI TTS to the client; optional ElevenLabs fallback when re-enabled. */
export async function streamLiveTtsToClient(
  res: ExpressResponse,
  params: LiveTtsParams,
): Promise<void> {
  const provider = getTtsProvider();
  const preferOpenAi = provider === "openai";

  if (preferOpenAi) {
    try {
      const openAiRes = await fetchOpenAiTtsStream(params.text);
      const ok = await streamUpstreamToClient(res, openAiRes, params.cacheKey, "openai");
      if (ok) return;
    } catch (err) {
      if (!isElevenLabsTtsEnabled()) {
        logger.error(
          {
            evt: "tts.live_stream_failed",
            cacheKey: params.cacheKey,
            message: err instanceof Error ? err.message : String(err),
          },
          "OpenAI TTS failed (ElevenLabs disabled)",
        );
        if (!res.headersSent) res.status(502).json({ error: "tts_failed" });
        return;
      }
      logger.warn(
        {
          evt: "tts.openai_fallback",
          cacheKey: params.cacheKey,
          message: err instanceof Error ? err.message : String(err),
        },
        "OpenAI TTS failed — falling back to ElevenLabs",
      );
    }
  }

  if (!isElevenLabsTtsEnabled()) {
    if (!res.headersSent) res.status(502).json({ error: "tts_failed" });
    return;
  }

  try {
    const elevenRes = await fetchElevenLabsTtsStream(params.text, {
      voiceId: params.voiceId,
      modelId: params.modelId,
      mode: params.mode,
    });
    const ok = await streamUpstreamToClient(res, elevenRes, params.cacheKey, "elevenlabs");
    if (ok) return;
  } catch (err) {
    logger.error(
      {
        evt: "tts.live_stream_failed",
        cacheKey: params.cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "TTS live stream failed",
    );
    if (!res.headersSent) {
      res.status(502).json({ error: "tts_failed" });
    }
    return;
  }

  if (!res.headersSent) {
    res.status(502).json({ error: "tts_failed" });
  }
}
