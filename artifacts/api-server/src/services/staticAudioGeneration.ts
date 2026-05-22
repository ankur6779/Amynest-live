import type { StaticAudioMode } from "@workspace/static-audio";
import { getStaticAudioHash } from "@workspace/static-audio";
import { logger } from "../lib/logger.js";
import { readCachedAudio } from "./ttsCacheService.js";
import { generateOpenAiTts } from "./ttsGenerate.js";
import { writeStaticAudioToGcs } from "./ttsAudioStore.js";
import { setCachedStaticAudioBuffer } from "./staticAudioBufferCache.js";
import { upsertRegistryRow } from "./staticAudioRegistry.js";

const SYNC_GEN_MS = Number(process.env.STATIC_AUDIO_SYNC_GEN_MS ?? "8000");

export async function generateAndPersistStaticPhrase(
  text: string,
  mode: StaticAudioMode,
  source = "runtime",
): Promise<Buffer | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const hash = getStaticAudioHash(trimmed, mode);

  const gen = await Promise.race([
    generateOpenAiTts({ text: trimmed, mode, category: mode === "phonics" ? "phonics" : "words" }),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SYNC_GEN_MS)),
  ]);

  if (!gen?.url) {
    logger.warn({ evt: "static_audio.sync_gen_failed", hash, text: trimmed.slice(0, 80) }, "sync TTS failed");
    return null;
  }

  try {
    const cached = await readCachedAudio(gen.cacheKey);
    const buffer = cached?.buffer;
    if (!buffer?.byteLength) return null;

    const upload = await writeStaticAudioToGcs(hash, buffer);
    await upsertRegistryRow({
      hash,
      text: trimmed,
      mode,
      audioUrl: upload.success ? upload.publicUrl : gen.url,
      audioData: buffer,
      gcsPresent: upload.success,
      source,
    });
    setCachedStaticAudioBuffer(hash, buffer);
    return buffer;
  } catch (err) {
    logger.warn(
      { evt: "static_audio.persist_failed", hash, err: err instanceof Error ? err.message : String(err) },
      "static persist failed",
    );
    return null;
  }
}
