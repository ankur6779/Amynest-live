import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { isValidSpellingGcsObjectPath } from "@workspace/spelling-audio";
import { logger } from "../lib/logger.js";
import { legacyGcsConfigured, readGcsObjectBytes } from "../services/ttsAudioStore.js";
import { serveStaticAudioBuffer } from "../services/staticAudioServe.js";
import { getPlaceholderMp3 } from "../services/staticAudioPlaceholder.js";

export const spellingLibraryPublicRouter: IRouter = Router();

function etagKeyForObjectPath(objectPath: string): string {
  return createHash("md5").update(objectPath).digest("hex");
}

function decodeObjectPathParam(raw: string): string {
  try {
    return decodeURIComponent(raw.trim());
  } catch {
    return raw.trim();
  }
}

/**
 * GET /api/spelling-library/spelling/v{n}/{slug}.mp3
 *
 * Streams pre-generated spelling library MP3s from GCS via the API so browsers
 * never fetch storage.googleapis.com directly (CORS + bucket ACL).
 */
spellingLibraryPublicRouter.get("/spelling-library/*objectPath", async (req, res): Promise<void> => {
  const objectPath = decodeObjectPathParam(String(req.params.objectPath ?? ""));

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
      res.status(404).json({ error: "spelling_audio_missing" });
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
