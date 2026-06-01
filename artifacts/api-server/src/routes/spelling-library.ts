import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { isValidSpellingGcsObjectPath } from "@workspace/spelling-audio";
import { logger } from "../lib/logger.js";
import { legacyGcsConfigured, readGcsObjectBytes } from "../services/ttsAudioStore.js";
import { serveStaticAudioBuffer } from "../services/staticAudioServe.js";
import { getPlaceholderMp3 } from "../services/staticAudioPlaceholder.js";

export const spellingLibraryPublicRouter: IRouter = Router();

/** Explicit CORS for cross-origin fetch from www.amynest.in (prefetch / IndexedDB warm). */
spellingLibraryPublicRouter.use((req, res, next) => {
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

/**
 * GET /api/spelling-library/spelling/v{n}/{slug}.mp3
 *
 * Streams pre-generated spelling library MP3s from GCS via the API so browsers
 * never fetch storage.googleapis.com directly (CORS + bucket ACL).
 */
spellingLibraryPublicRouter.get("/spelling-library/*objectPath", async (req, res): Promise<void> => {
  const rawParam = req.params.objectPath;
  const objectPath = decodeObjectPathParam(
    Array.isArray(rawParam) ? rawParam : (rawParam ?? ""),
  );

  if (!isValidSpellingGcsObjectPath(objectPath)) {
    res.status(400).json({ error: "invalid_spelling_path" });
    return;
  }

  const etagKey = etagKeyForObjectPath(objectPath);

  if (!legacyGcsConfigured()) {
    logger.warn(
      { evt: "spelling_library.gcs_unconfigured", objectPath },
      "spelling library proxy — GCS not configured",
    );
    serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
    return;
  }

  try {
    const buffer = await readGcsObjectBytes(objectPath);
    if (!buffer?.byteLength) {
      logger.warn(
        { evt: "spelling_library.missing", objectPath },
        "spelling library object missing in GCS",
      );
      serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
      return;
    }

    serveStaticAudioBuffer(req, res, etagKey, buffer, "gcs");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { evt: "spelling_library.stream_failed", objectPath, message },
      "spelling library stream failed",
    );
    serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
  }
});
