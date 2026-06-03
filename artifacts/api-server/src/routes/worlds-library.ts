import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import {
  WORLD_IDS,
  isValidWorldsLibraryObjectPath,
  type WorldId,
} from "@workspace/world-engine";
import { logger } from "../lib/logger.js";
import { legacyGcsConfigured, readGcsObjectBytes } from "../services/ttsAudioStore.js";
import { serveStaticAudioBuffer } from "../services/staticAudioServe.js";
import { getPlaceholderMp3 } from "../services/staticAudioPlaceholder.js";

export const worldsLibraryPublicRouter: IRouter = Router();

worldsLibraryPublicRouter.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Accept, Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

function etagKeyForObjectPath(objectPath: string): string {
  return createHash("md5").update(objectPath).digest("hex");
}

function decodeObjectPathParam(raw: string | string[]): string {
  const joined = Array.isArray(raw) ? raw.join("/") : raw;
  try {
    return decodeURIComponent(joined.trim());
  } catch {
    return joined.trim();
  }
}

function contentTypeForPath(objectPath: string): string {
  const lower = objectPath.toLowerCase();
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".json")) return "application/json";
  return "audio/mpeg";
}

function resolveWorldIdForPath(objectPath: string): WorldId | null {
  for (const worldId of WORLD_IDS) {
    if (worldId === "animal_world") continue;
    if (isValidWorldsLibraryObjectPath(worldId, objectPath)) return worldId;
  }
  return null;
}

/**
 * GET /api/worlds-library/worlds/{vehicles|nature|home|instruments}/...
 *
 * Streams pre-generated discovery world assets from GCS. Animal World remains on
 * /api/animal-world-library/ (unchanged).
 */
worldsLibraryPublicRouter.get(
  "/worlds-library/*objectPath",
  async (req, res): Promise<void> => {
    const rawParam = req.params.objectPath;
    const objectPath = decodeObjectPathParam(
      Array.isArray(rawParam) ? rawParam : (rawParam ?? ""),
    );

    const worldId = resolveWorldIdForPath(objectPath);
    if (!worldId) {
      res.status(400).json({ error: "invalid_worlds_library_path" });
      return;
    }

    const etagKey = etagKeyForObjectPath(objectPath);

    const isAudio = objectPath.toLowerCase().endsWith(".mp3");

    if (!legacyGcsConfigured()) {
      logger.warn({ evt: "worlds_library.gcs_unconfigured", objectPath, worldId });
      if (isAudio) {
        serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
      } else {
        res.status(404).json({ error: "asset_unavailable" });
      }
      return;
    }

    try {
      const buffer = await readGcsObjectBytes(objectPath);
      if (!buffer?.byteLength) {
        logger.warn({ evt: "worlds_library.missing", objectPath, worldId });
        if (isAudio) {
          serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
        } else {
          res.status(404).json({ error: "asset_missing" });
        }
        return;
      }
      serveStaticAudioBuffer(req, res, etagKey, buffer, "gcs", {
        contentType: contentTypeForPath(objectPath),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error({ evt: "worlds_library.stream_failed", objectPath, worldId, message });
      if (isAudio) {
        serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
      } else {
        res.status(500).json({ error: "stream_failed" });
      }
    }
  },
);
