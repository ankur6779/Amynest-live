import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  computeCatalogMissingStaticAudioKeys,
  mergeMissingStaticAudioKeys,
} from "@workspace/static-audio";
import { getGcsBucketId } from "../lib/env.js";
import { getShippedStaticAudioMap } from "../lib/static-audio-map.js";
import { logger } from "../lib/logger.js";
import {
  getStaticAudioMetrics,
  isStaticAudioCircuitOpen,
  recordOriginServe,
  recordResponseTimeMs,
  recordStaticAudioRequest,
} from "../services/staticAudioMetrics.js";
import { isLastGcsProbeOk } from "../services/staticAudioMonitor.js";
import { sendStaticAudioAlert } from "../services/staticAudioAlerts.js";
import { getStaticAudioBuffer, hasCachedStaticAudioBuffer } from "../services/staticAudioLoader.js";
import { serveStaticAudioBuffer } from "../services/staticAudioServe.js";
import { legacyGcsConfigured } from "../services/ttsAudioStore.js";

const reportedMissing = new Set<string>();

const reportBodySchema = z.object({
  keys: z.array(z.string().min(1).max(256)).max(50).optional(),
  key: z.string().min(1).max(256).optional(),
});

const HASH_RE = /^[a-f0-9]{32}$/;

/**
 * Edge cache (Cloudflare): cache `/api/static-audio/*` by full URL (hash path).
 * Respect `CDN-Cache-Control` / `Cache-Control` (immutable + SWR).
 */
export const staticAudioPublicRouter: IRouter = Router();

staticAudioPublicRouter.get("/static-audio/health", (_req, res): void => {
  const gcs = legacyGcsConfigured();
  const bucket = getGcsBucketId() ?? "";
  const status = gcs && bucket ? "ok" : "degraded";

  if (process.env.NODE_ENV === "development") {
    console.log("[STATIC AUDIO HEALTH]", { gcs, bucket, status });
  }

  res.json({
    gcs,
    bucket,
    status,
    circuitOpen: isStaticAudioCircuitOpen(),
    gcsProbeOk: isLastGcsProbeOk(),
  });
});

staticAudioPublicRouter.get("/static-audio/metrics", (_req, res): void => {
  res.json(getStaticAudioMetrics());
});

staticAudioPublicRouter.get("/static-audio/:hash.mp3", async (req, res): Promise<void> => {
  const started = performance.now();
  const hash = String(req.params.hash ?? "").toLowerCase();

  if (!HASH_RE.test(hash)) {
    recordStaticAudioRequest("failed");
    res.status(400).send("invalid hash");
    return;
  }

  if (process.env.NODE_ENV === "development") {
    console.log("[STATIC AUDIO REQUEST]", hash);
  }

  if (isStaticAudioCircuitOpen()) {
    recordStaticAudioRequest("failed");
    recordResponseTimeMs(performance.now() - started);
    console.error("[STATIC AUDIO ERROR]", { hash, error: "circuit_open" });
    res.status(503).json({ error: "circuit_open" });
    return;
  }

  if (!legacyGcsConfigured()) {
    recordStaticAudioRequest("failed");
    recordResponseTimeMs(performance.now() - started);
    logger.error({ evt: "static_audio.gcs_not_configured", hash }, "static audio GCS not configured");
    console.error("[STATIC AUDIO ERROR]", { hash, error: "gcs_not_configured" });
    res.status(500).json({ error: "gcs_not_configured" });
    return;
  }

  try {
    const fromMemory = hasCachedStaticAudioBuffer(hash);
    const buffer = await getStaticAudioBuffer(hash);
    if (!buffer) {
      recordStaticAudioRequest("notFound");
      recordResponseTimeMs(performance.now() - started);
      console.error("[STATIC AUDIO ERROR]", { hash, error: "not_found" });
      res.status(404).json({ error: "not_found" });
      return;
    }

    const originSource = fromMemory ? "memory" : "gcs";
    recordOriginServe(req.headers as Record<string, unknown>, originSource, buffer.byteLength);
    recordStaticAudioRequest("success");
    recordResponseTimeMs(performance.now() - started);
    console.log("[STATIC AUDIO SERVE]", {
      hash,
      success: true,
      bytes: buffer.byteLength,
      ms: Math.round(performance.now() - started),
      originCache: originSource,
    });
    serveStaticAudioBuffer(req, res, hash, buffer, originSource);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    recordStaticAudioRequest("failed");
    recordResponseTimeMs(performance.now() - started);
    console.error("[STATIC AUDIO ERROR]", { hash, error: message });

    if (message === "too_many_requests") {
      res.status(503).send("too_many_requests");
      return;
    }

    logger.error(
      { evt: "static_audio.stream_failed", hash, message },
      "static audio stream failed",
    );

    if (message === "gcs_timeout") {
      void sendStaticAudioAlert("gcs_timeout", { hash });
      res.status(504).json({ error: "gcs_timeout" });
      return;
    }
    void sendStaticAudioAlert("gcs_failure", { hash, error: message });
    res.status(500).json({ error: "gcs_failure" });
  }
});

staticAudioPublicRouter.get("/static-audio/missing", (_req, res): void => {
  const catalogMissing = computeCatalogMissingStaticAudioKeys(getShippedStaticAudioMap());
  const missing = mergeMissingStaticAudioKeys(catalogMissing, reportedMissing);

  logger.info(
    {
      evt: "static_audio.missing_list",
      count: missing.length,
      catalog: catalogMissing.length,
      reported: reportedMissing.size,
    },
    "static audio missing keys listed",
  );

  res.json({ missing });
});

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
