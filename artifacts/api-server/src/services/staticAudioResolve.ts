import {
  getCachedStaticAudioBuffer,
  hasCachedStaticAudioBuffer,
  setCachedStaticAudioBuffer,
} from "./staticAudioBufferCache.js";
import { getStaticAudioBuffer } from "./staticAudioLoader.js";
import { getPlaceholderMp3 } from "./staticAudioPlaceholder.js";
import {
  getRegistryRow,
  lookupPhraseByHash,
  recordRegistryMiss,
  upsertRegistryRow,
} from "./staticAudioRegistry.js";
import { generateAndPersistStaticPhrase } from "./staticAudioGeneration.js";
import {
  enqueueStaticAudioGeneration,
  isStaticAudioWorkerPreferred,
} from "./staticAudioGenerationQueue.js";
import {
  readStaticAudioFromGcs,
  readStaticAudioFromSecondaryGcs,
  writeStaticAudioToGcs,
} from "./ttsAudioStore.js";
import {
  recordDbFallbackServe,
  recordOnDemandGeneration,
  recordPlaceholderServe,
} from "./staticAudioMetrics.js";
import { logger } from "../lib/logger.js";

export type StaticResolveSource =
  | "memory"
  | "gcs"
  | "secondary_gcs"
  | "postgres"
  | "sync_generated"
  | "placeholder";

export type StaticResolveResult = {
  buffer: Buffer;
  source: StaticResolveSource;
};

async function tryPostgres(hash: string): Promise<Buffer | null> {
  const row = await getRegistryRow(hash);
  if (!row?.audioData || row.audioData.byteLength === 0) return null;
  recordDbFallbackServe();
  if (!row.gcsPresent) {
    void writeStaticAudioToGcs(hash, row.audioData).then((up) => {
      if (up.success) {
        void upsertRegistryRow({
          hash,
          text: row.text,
          mode: row.mode as "default" | "phonics",
          audioUrl: up.publicUrl,
          audioData: row.audioData,
          gcsPresent: true,
          source: row.source,
        });
      }
    });
  }
  return row.audioData;
}

/** Fail-safe resolve: never returns null — placeholder as last resort. */
export async function resolveStaticAudioBuffer(hash: string): Promise<StaticResolveResult> {
  if (hasCachedStaticAudioBuffer(hash)) {
    const buf = getCachedStaticAudioBuffer(hash);
    if (buf) return { buffer: buf, source: "memory" };
  }

  try {
    const fromLoader = await getStaticAudioBuffer(hash);
    if (fromLoader?.byteLength) {
      return { buffer: fromLoader, source: hasCachedStaticAudioBuffer(hash) ? "memory" : "gcs" };
    }
  } catch {
    /* continue */
  }

  const secondary = await readStaticAudioFromSecondaryGcs(hash);
  if (secondary?.byteLength) {
    setCachedStaticAudioBuffer(hash, secondary);
    return { buffer: secondary, source: "secondary_gcs" };
  }

  const fromDb = await tryPostgres(hash);
  if (fromDb?.byteLength) {
    setCachedStaticAudioBuffer(hash, fromDb);
    return { buffer: fromDb, source: "postgres" };
  }

  const indexed = lookupPhraseByHash(hash);
  const row = await getRegistryRow(hash);
  const text = indexed?.text ?? row?.text ?? "";
  const mode = (indexed?.mode ?? row?.mode ?? "default") as "default" | "phonics";

  if (text?.trim()) {
    if (!isStaticAudioWorkerPreferred()) {
      const generated = await generateAndPersistStaticPhrase(text, mode, "on_demand_sync");
      if (generated?.byteLength) {
        recordOnDemandGeneration();
        return { buffer: generated, source: "sync_generated" };
      }
    } else {
      enqueueStaticAudioGeneration(text, mode, hash);
    }
  } else {
    void recordRegistryMiss(hash);
  }

  const retryGcs = await readStaticAudioFromGcs(hash).catch(() => null);
  if (retryGcs?.byteLength) {
    setCachedStaticAudioBuffer(hash, retryGcs);
    return { buffer: retryGcs, source: "gcs" };
  }

  recordPlaceholderServe();
  logger.warn({ evt: "static_audio.placeholder_serve", hash }, "serving placeholder MP3");
  return { buffer: getPlaceholderMp3(), source: "placeholder" };
}
