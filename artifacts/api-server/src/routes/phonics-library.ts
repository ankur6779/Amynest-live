import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { isValidPhonicsGcsObjectPath } from "@workspace/phonics-sounds";
import { logger } from "../lib/logger.js";
import { legacyGcsConfigured, readGcsObjectBytes } from "../services/ttsAudioStore.js";
import { serveStaticAudioBuffer } from "../services/staticAudioServe.js";
import { getPlaceholderMp3 } from "../services/staticAudioPlaceholder.js";

export const phonicsLibraryPublicRouter: IRouter = Router();

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
 * GET /api/phonics-library/phonics/{category}/{id}.mp3
 *
 * Streams pre-generated phonics library MP3s from GCS via the API so browsers
 * never fetch storage.googleapis.com directly (CORS + bucket ACL).
 * Public, unauthenticated — input is bounded to phonics/*.mp3 paths only.
 */
phonicsLibraryPublicRouter.get("/phonics-library/*objectPath", async (req, res): Promise<void> => {
  const rawParam = req.params.objectPath;
  const objectPath = decodeObjectPathParam(
    Array.isArray(rawParam) ? rawParam : (rawParam ?? ""),
  );

  if (!isValidPhonicsGcsObjectPath(objectPath)) {
    res.status(400).json({ error: "invalid_phonics_path" });
    return;
  }

  const etagKey = etagKeyForObjectPath(objectPath);

  if (!legacyGcsConfigured()) {
    logger.warn(
      { evt: "phonics_library.gcs_unconfigured", objectPath },
      "phonics library proxy — GCS not configured",
    );
    serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
    return;
  }

  try {
    const buffer = await readGcsObjectBytes(objectPath);
    if (!buffer?.byteLength) {
      logger.warn(
        { evt: "phonics_library.missing", objectPath },
        "phonics library object missing in GCS",
      );
      res.status(404).json({ error: "phonics_audio_missing" });
      return;
    }

    serveStaticAudioBuffer(req, res, etagKey, buffer, "gcs");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { evt: "phonics_library.stream_failed", objectPath, message },
      "phonics library stream failed",
    );
    serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
  }
});
