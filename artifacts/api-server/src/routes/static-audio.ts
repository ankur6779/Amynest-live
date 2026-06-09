import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  computeCatalogMissingStaticAudioKeys,
  mergeMissingStaticAudioKeys,
} from "@workspace/static-audio";
import { getShippedStaticAudioMap } from "../lib/static-audio-map.js";
import { logger } from "../lib/logger.js";
import {
  getStaticAudioMetrics,
  isStaticAudioCircuitOpen,
  recordMissingAudioReport,
  recordOriginServe,
  recordResponseTimeMs,
  recordStaticAudioRequest,
} from "../services/staticAudioMetrics.js";
import { isLastGcsProbeOk } from "../services/staticAudioMonitor.js";
import { sendStaticAudioAlert } from "../services/staticAudioAlerts.js";
import { serveStaticAudioBuffer } from "../services/staticAudioServe.js";
import { legacyGcsConfigured } from "../services/ttsAudioStore.js";
import { resolveStaticAudioBuffer } from "../services/staticAudioResolve.js";
import { rebuildStaticHashIndex } from "../services/staticAudioRegistry.js";
import { getPlaceholderMp3 } from "../services/staticAudioPlaceholder.js";
import { enqueueStaticAudioGeneration } from "../services/staticAudioGenerationQueue.js";
import {
  extractTextFromMissingKey,
  parseStaticAudioMissingKey,
} from "@workspace/static-audio";
import { getAuth } from "../lib/auth.js";
import { checkDistributedRateLimit } from "../lib/distributed-rate-limit.js";

const reportedMissing = new Set<string>();

const reportBodySchema = z.object({
  keys: z.array(z.string().min(1).max(256)).max(50).optional(),
  key: z.string().min(1).max(256).optional(),
  priorities: z.record(z.string(), z.number()).optional(),
});

const HASH_RE = /^[a-f0-9]{32}$/;

export const staticAudioPublicRouter: IRouter = Router();

rebuildStaticHashIndex();

staticAudioPublicRouter.get("/static-audio/health", (_req, res): void => {
  const gcs = legacyGcsConfigured();
  const status = gcs ? "ok" : "degraded";

  res.json({
    gcs,
    status,
    ok: status === "ok" && isLastGcsProbeOk(),
    circuitOpen: isStaticAudioCircuitOpen(),
    gcsProbeOk: isLastGcsProbeOk(),
  });
});

staticAudioPublicRouter.get("/static-audio/:hash.mp3", async (req, res): Promise<void> => {
  const started = performance.now();
  const hash = String(req.params.hash ?? "").toLowerCase();

  if (!HASH_RE.test(hash)) {
    recordStaticAudioRequest("success");
    serveStaticAudioBuffer(req, res, hash, getPlaceholderMp3(), "memory", {
      staticSource: "placeholder",
    });
    return;
  }

  try {
    const resolved = await resolveStaticAudioBuffer(hash);
    const originSource =
      resolved.source === "memory"
        ? "memory"
        : resolved.source === "postgres" || resolved.source === "placeholder"
          ? "memory"
          : "gcs";

    recordOriginServe(req.headers as Record<string, unknown>, originSource, resolved.buffer.byteLength);
    recordStaticAudioRequest("success");
    recordResponseTimeMs(performance.now() - started);

    if (resolved.source === "placeholder") {
      void sendStaticAudioAlert("placeholder_serve", { hash });
    }

    serveStaticAudioBuffer(req, res, hash, resolved.buffer, originSource, {
      staticSource: resolved.source === "placeholder" ? "placeholder" : "asset",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ evt: "static_audio.stream_failed", hash, message }, "static audio resolve failed");
    recordStaticAudioRequest("success");
    serveStaticAudioBuffer(req, res, hash, getPlaceholderMp3(), "memory", {
      staticSource: "placeholder",
    });
  }
});

function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

/** Authenticated missing-audio reports — enqueues TTS generation (cost-sensitive). */
export const staticAudioAuthRouter: IRouter = Router();

staticAudioAuthRouter.get("/static-audio/metrics", (req, res): void => {
  const userId = getAuth(req)?.userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
  res.json(getStaticAudioMetrics());
});

staticAudioAuthRouter.get("/static-audio/missing", (req, res): void => {
  const userId = getAuth(req)?.userId;
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "forbidden" });
    return;
  }
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

staticAudioAuthRouter.post("/static-audio/missing", async (req, res): Promise<void> => {
  const userId = getAuth(req)?.userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const rate = await checkDistributedRateLimit(`static-audio-missing:${userId}`, {
    windowMs: 60_000,
    maxPerWindow: 30,
  });
  if (!rate.allowed) {
    res.status(429).json({ error: "rate_limited", retryAfterMs: rate.retryAfterMs });
    return;
  }

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
    if (!trimmed) continue;
    reportedMissing.add(trimmed);
    recordMissingAudioReport();
    const parsedKey = parseStaticAudioMissingKey(trimmed);
    if (parsedKey) {
      const text = extractTextFromMissingKey(trimmed);
      const priority = parsed.data.priorities?.[trimmed] ?? 25;
      if (text) enqueueStaticAudioGeneration(text, parsedKey.mode, undefined, priority);
    }
  }

  if (keys.length > 0) {
    logger.warn(
      {
        evt: "static_audio.missing_reported",
        userId,
        keys: keys.slice(0, 20),
        total: reportedMissing.size,
      },
      "static audio missing key reported by client",
    );
  }

  res.status(204).end();
});
