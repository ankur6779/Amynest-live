import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  computeCatalogMissingStaticAudioKeys,
  mergeMissingStaticAudioKeys,
} from "@workspace/static-audio";
import { getShippedStaticAudioMap } from "../lib/static-audio-map.js";
import { logger } from "../lib/logger";

/** Runtime misses reported by clients (production playback). */
const reportedMissing = new Set<string>();

const reportBodySchema = z.object({
  keys: z.array(z.string().min(1).max(256)).max(50).optional(),
  key: z.string().min(1).max(256).optional(),
});

export const staticAudioPublicRouter: IRouter = Router();

/**
 * GET /api/static-audio/missing
 * Union of catalog gaps (shipped map vs phrase list) and client-reported misses.
 */
staticAudioPublicRouter.get("/static-audio/missing", (_req, res): void => {
  const catalogMissing = computeCatalogMissingStaticAudioKeys(getShippedStaticAudioMap());
  const missing = mergeMissingStaticAudioKeys(catalogMissing, reportedMissing);

  logger.info(
    { evt: "static_audio.missing_list", count: missing.length, catalog: catalogMissing.length, reported: reportedMissing.size },
    "static audio missing keys listed",
  );

  res.json({ missing });
});

/**
 * POST /api/static-audio/missing
 * Clients report keys at runtime (`mode:normalized`) so prod misses are visible.
 */
staticAudioPublicRouter.post("/static-audio/missing", (req, res): void => {
  const parsed = reportBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const keys = [
    ...(parsed.data.keys ?? []),
    ...(parsed.data.key ? [parsed.data.key] : []),
  ];

  for (const key of keys) {
    const trimmed = key.trim();
    if (trimmed) reportedMissing.add(trimmed);
  }

  if (keys.length > 0) {
    logger.warn(
      { evt: "static_audio.missing_reported", keys: keys.slice(0, 20), total: reportedMissing.size },
      "static audio missing key reported by client",
    );
  }

  res.status(204).end();
});
