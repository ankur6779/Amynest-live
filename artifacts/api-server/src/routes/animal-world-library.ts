import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { isValidAnimalWorldGcsObjectPath } from "@workspace/animal-world";
import { logger } from "../lib/logger.js";
import { legacyGcsConfigured, readGcsObjectBytes } from "../services/ttsAudioStore.js";
import { serveStaticAudioBuffer } from "../services/staticAudioServe.js";
import { getPlaceholderMp3 } from "../services/staticAudioPlaceholder.js";

export const animalWorldLibraryPublicRouter: IRouter = Router();

/** Explicit CORS for cross-origin fetch from www.amynest.in (prefetch / cache warm). */
animalWorldLibraryPublicRouter.use((req, res, next) => {
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

function serveBuffer(
  req: Parameters<typeof serveStaticAudioBuffer>[0],
  res: Parameters<typeof serveStaticAudioBuffer>[1],
  etagKey: string,
  buffer: Buffer,
  source: "memory" | "gcs",
  objectPath: string,
): void {
  serveStaticAudioBuffer(req, res, etagKey, buffer, source, {
    contentType: contentTypeForPath(objectPath),
  });
}

/**
 * GET /api/animal-world-library/animal-world/{category}/{animal}/{file}
 *
 * Streams pre-generated Animal World assets from GCS via the API so browsers
 * never fetch storage.googleapis.com directly (CORS + bucket ACL).
 */
animalWorldLibraryPublicRouter.get(
  "/animal-world-library/*objectPath",
  async (req, res): Promise<void> => {
    const rawParam = req.params.objectPath;
    const objectPath = decodeObjectPathParam(
      Array.isArray(rawParam) ? rawParam : (rawParam ?? ""),
    );

    if (!isValidAnimalWorldGcsObjectPath(objectPath)) {
      res.status(400).json({ error: "invalid_animal_world_path" });
      return;
    }

    const etagKey = etagKeyForObjectPath(objectPath);
    const isAudio = objectPath.toLowerCase().endsWith(".mp3");

    if (!legacyGcsConfigured()) {
      logger.warn(
        { evt: "animal_world_library.gcs_unconfigured", objectPath },
        "animal world library proxy — GCS not configured",
      );
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
        logger.warn(
          { evt: "animal_world_library.missing", objectPath },
          "animal world object missing in GCS",
        );
        if (isAudio) {
          serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
        } else {
          res.status(404).json({ error: "asset_missing" });
        }
        return;
      }

      serveBuffer(req, res, etagKey, buffer, "gcs", objectPath);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(
        { evt: "animal_world_library.stream_failed", objectPath, message },
        "animal world library stream failed",
      );
      if (isAudio) {
        serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
      } else {
        res.status(500).json({ error: "stream_failed" });
      }
    }
  },
);
