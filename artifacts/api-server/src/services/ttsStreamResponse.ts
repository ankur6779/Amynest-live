import type { Response as ExpressResponse } from "express";
import { logger } from "../lib/logger.js";

/** Pipe a fetch `Response` body to Express without buffering or base64 encoding. */
export async function pipeFetchAudioToExpress(
  res: ExpressResponse,
  upstream: Response,
  opts: { cacheKey?: string; source: string },
): Promise<void> {
  if (!upstream.body) {
    res.status(502).json({ error: "tts_empty_audio" });
    return;
  }

  res.status(200);
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "no-cache, no-store");
  res.setHeader("Transfer-Encoding", "chunked");

  const reader = upstream.body.getReader();
  const pump = async (): Promise<void> => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!res.write(value)) {
          await new Promise<void>((resolve) => res.once("drain", resolve));
        }
      }
      res.end();
    } catch (err) {
      reader.cancel().catch(() => {});
      if (!res.headersSent) {
        res.status(500).json({ error: "stream_failed" });
        return;
      }
      res.destroy();
      logger.warn(
        {
          evt: "tts.live_stream_aborted",
          source: opts.source,
          cacheKey: opts.cacheKey,
          message: err instanceof Error ? err.message : String(err),
        },
        "TTS live stream aborted",
      );
    }
  };

  await pump();
}
