import type { Response as ExpressResponse } from "express";
import { logger } from "../lib/logger.js";
import type { SynthesizeMode } from "./ttsCacheService.js";
import { streamOpenAiTtsWithCache } from "./openaiTtsStreamCache.js";

export interface LiveTtsParams {
  text: string;
  voiceId: string;
  modelId: string;
  mode: SynthesizeMode;
  cacheKey: string;
}

/** Stream OpenAI TTS to the client (cache-first, then live upstream). */
export async function streamLiveTtsToClient(
  res: ExpressResponse,
  params: LiveTtsParams,
): Promise<void> {
  try {
    const ok = await streamOpenAiTtsWithCache(res, params);
    if (ok) return;
  } catch (err) {
    logger.error(
      {
        evt: "tts.live_stream_failed",
        cacheKey: params.cacheKey,
        message: err instanceof Error ? err.message : String(err),
      },
      "OpenAI TTS live stream failed",
    );
  }
  if (!res.headersSent) {
    res.status(502).json({ error: "tts_failed" });
  }
}
