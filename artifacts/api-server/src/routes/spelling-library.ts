import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { isValidSpellingGcsObjectPath } from "@workspace/spelling-audio";
import { logger } from "../lib/logger.js";
import {
  legacyGcsConfigured,
  readGcsObjectBytes,
  writeGcsObjectBytes,
} from "../services/ttsAudioStore.js";
import { serveStaticAudioBuffer } from "../services/staticAudioServe.js";
import { getPlaceholderMp3 } from "../services/staticAudioPlaceholder.js";
import { spellingWordForSlug } from "../services/spelling-audio-manifest.js";
import { synthesizeSafe } from "../services/ttsSafe.js";
import { readCachedAudio } from "../services/ttsCacheService.js";
import { checkDistributedRateLimit } from "../lib/distributed-rate-limit.js";

export const spellingLibraryPublicRouter: IRouter = Router();

/**
 * Lazy self-healing: when a pre-generated spelling clip is missing, the
 * proxy synthesises it on the fly (the slug IS the word), serves it, and
 * persists it back to GCS so the next request streams it directly. This
 * removes the "Retry audio" friction for any word that was never batch-
 * generated, without a giant pre-generation run.
 *
 * Bounded + abuse-safe:
 *  - Only words present in the spelling manifest are generated (the slug
 *    is gated by `spellingWordForSlug`), so the public endpoint can't be
 *    coerced into synthesizing arbitrary text.
 *  - In-flight de-dupe collapses concurrent requests (e.g. prefetch of the
 *    next few words) onto a single synthesis.
 *  - After the first generation the audio is cached (TTS cache) and, when
 *    GCS is configured, persisted to `spelling/v{n}/{slug}.mp3`.
 */
const inflightGeneration = new Map<string, Promise<Buffer | null>>();

async function generateSpellingAudioOnMiss(
  objectPath: string,
): Promise<Buffer | null> {
  const match = /^spelling\/v\d+\/([a-z0-9_-]+)\.mp3$/i.exec(objectPath);
  const slug = match?.[1];
  if (!slug) return null;
  const word = spellingWordForSlug(slug);
  if (!word) return null; // unknown word — never synthesize arbitrary text

  const existing = inflightGeneration.get(objectPath);
  if (existing) return existing;

  const task = (async (): Promise<Buffer | null> => {
    try {
      const synth = await synthesizeSafe(word, { mode: "default" });
      if (!synth) return null;
      const cached = await readCachedAudio(synth.cacheKey);
      const buffer = cached?.buffer ?? null;
      if (buffer?.byteLength) {
        // Persist to the canonical spelling path so future reads stream
        // straight from GCS (no re-synthesis). Best-effort, non-blocking.
        void writeGcsObjectBytes(objectPath, buffer);
        logger.info(
          { evt: "spelling_library.lazy_generated", objectPath, word, bytes: buffer.byteLength },
          "spelling library audio lazily generated",
        );
      }
      return buffer;
    } catch (err) {
      logger.warn(
        {
          evt: "spelling_library.lazy_generate_failed",
          objectPath,
          message: err instanceof Error ? err.message : String(err),
        },
        "spelling library lazy generation failed",
      );
      return null;
    } finally {
      inflightGeneration.delete(objectPath);
    }
  })();

  inflightGeneration.set(objectPath, task);
  return task;
}

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
  const clientIp = String(req.ip ?? req.socket.remoteAddress ?? "unknown");
  const rate = await checkDistributedRateLimit(`spelling-library:${clientIp}`, {
    windowMs: 60_000,
    maxPerWindow: 120,
  });
  if (!rate.allowed) {
    res.status(429).json({ error: "rate_limited", retryAfterMs: rate.retryAfterMs });
    return;
  }

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
    const generated = await generateSpellingAudioOnMiss(objectPath);
    if (generated?.byteLength) {
      serveStaticAudioBuffer(req, res, etagKey, generated, "memory");
      return;
    }
    serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
    return;
  }

  try {
    const buffer = await readGcsObjectBytes(objectPath);
    if (buffer?.byteLength) {
      serveStaticAudioBuffer(req, res, etagKey, buffer, "gcs");
      return;
    }

    logger.warn(
      { evt: "spelling_library.missing", objectPath },
      "spelling library object missing in GCS — generating on demand",
    );
    const generated = await generateSpellingAudioOnMiss(objectPath);
    if (generated?.byteLength) {
      serveStaticAudioBuffer(req, res, etagKey, generated, "memory");
      return;
    }
    serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      { evt: "spelling_library.stream_failed", objectPath, message },
      "spelling library stream failed",
    );
    const generated = await generateSpellingAudioOnMiss(objectPath).catch(() => null);
    if (generated?.byteLength) {
      serveStaticAudioBuffer(req, res, etagKey, generated, "memory");
      return;
    }
    serveStaticAudioBuffer(req, res, etagKey, getPlaceholderMp3(), "memory");
  }
});
