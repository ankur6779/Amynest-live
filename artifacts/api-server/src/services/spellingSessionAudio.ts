/**
 * Session-scoped spelling word audio — resolves manifest library paths
 * (not legacy per-session TTS cache keys).
 */
import { getSpellingGcsObjectPath } from "@workspace/spelling-audio";
import { logger } from "../lib/logger.js";
import { lookupSpellingAudioEntry } from "./spelling-audio-manifest.js";
import { readGcsObjectBytes } from "./ttsAudioStore.js";
import { synthesizeSafe } from "./ttsSafe.js";
import { readCachedAudio } from "./ttsCacheService.js";

const inflight = new Map<string, Promise<Buffer | null>>();

async function synthesizeSpellingWord(word: string): Promise<Buffer | null> {
  const objectPath = getSpellingGcsObjectPath(word);
  const existing = inflight.get(objectPath);
  if (existing) return existing;

  const task = (async (): Promise<Buffer | null> => {
    try {
      const synth = await synthesizeSafe(word, { mode: "default" });
      if (!synth) return null;
      const cached = await readCachedAudio(synth.cacheKey);
      return cached?.buffer ?? null;
    } catch (err) {
      logger.warn(
        {
          evt: "spelling.session_audio_synth_failed",
          word,
          message: err instanceof Error ? err.message : String(err),
        },
        "spelling session word synthesis failed",
      );
      return null;
    } finally {
      inflight.delete(objectPath);
    }
  })();

  inflight.set(objectPath, task);
  return task;
}

/** Load MP3 bytes for a spelling session word index via the catalog manifest. */
export async function readSpellingSessionWordAudio(
  word: string,
  catalogId?: string | null,
): Promise<Buffer | null> {
  const trimmed = (word ?? "").trim();
  if (!trimmed) return null;

  const entry = lookupSpellingAudioEntry(catalogId, trimmed);
  const objectPath = entry?.gcsPath?.trim() || getSpellingGcsObjectPath(trimmed);

  const fromGcs = await readGcsObjectBytes(objectPath).catch(() => null);
  if (fromGcs?.byteLength) return fromGcs;

  return synthesizeSpellingWord(trimmed);
}
