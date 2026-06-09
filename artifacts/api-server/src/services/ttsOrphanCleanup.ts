/**
 * Purge GCS tts-cache objects with no Postgres metadata row (orphans).
 */
import { db, ttsCacheTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { isTtsCacheGcsEnabled } from "../lib/env.js";
import {
  deleteTtsGcsObject,
  legacyGcsConfigured,
  listTtsCacheObjectNames,
} from "./ttsAudioStore.js";

const DEFAULT_BATCH = Number(process.env.TTS_ORPHAN_CLEANUP_BATCH ?? "200");
const PREFIX = "tts-cache/";

export type TtsOrphanCleanupResult = {
  scanned: number;
  orphans: number;
  deleted: number;
  dryRun: boolean;
};

function cacheKeyFromObjectName(name: string): string | null {
  if (!name.startsWith(PREFIX) || !name.endsWith(".mp3")) return null;
  const key = name.slice(PREFIX.length, -4);
  return /^[a-f0-9]{64}$/.test(key) ? key : null;
}

/** Remove GCS objects under tts-cache/ with no matching Postgres row. */
export async function runTtsOrphanCleanup(options?: {
  batchSize?: number;
  dryRun?: boolean;
}): Promise<TtsOrphanCleanupResult> {
  const dryRun = options?.dryRun ?? process.env.TTS_ORPHAN_CLEANUP_DRY_RUN === "1";
  const batchSize = Math.min(Math.max(1, options?.batchSize ?? DEFAULT_BATCH), 500);

  if (!isTtsCacheGcsEnabled() || !legacyGcsConfigured()) {
    return { scanned: 0, orphans: 0, deleted: 0, dryRun };
  }

  const objectNames = await listTtsCacheObjectNames(batchSize);
  const keys: string[] = [];
  const nameByKey = new Map<string, string>();
  for (const name of objectNames) {
    const cacheKey = cacheKeyFromObjectName(name);
    if (!cacheKey) continue;
    keys.push(cacheKey);
    nameByKey.set(cacheKey, name);
  }

  if (keys.length === 0) {
    return { scanned: 0, orphans: 0, deleted: 0, dryRun };
  }

  const rows = await db
    .select({ cacheKey: ttsCacheTable.cacheKey })
    .from(ttsCacheTable)
    .where(inArray(ttsCacheTable.cacheKey, keys));

  const known = new Set(rows.map((r) => r.cacheKey));
  let orphans = 0;
  let deleted = 0;

  for (const cacheKey of keys) {
    if (known.has(cacheKey)) continue;
    orphans += 1;
    const objectName = nameByKey.get(cacheKey);
    if (!objectName) continue;
    if (dryRun) {
      logger.info({ evt: "tts.orphan_would_delete", cacheKey }, "TTS orphan (dry run)");
      continue;
    }
    try {
      await deleteTtsGcsObject(objectName);
      deleted += 1;
    } catch (err) {
      logger.warn(
        {
          evt: "tts.orphan_delete_failed",
          cacheKey,
          message: err instanceof Error ? err.message : String(err),
        },
        "failed to delete TTS orphan object",
      );
    }
  }

  logger.info(
    { evt: "tts.orphan_cleanup", scanned: keys.length, orphans, deleted, dryRun },
    "TTS GCS orphan cleanup finished",
  );

  return { scanned: keys.length, orphans, deleted, dryRun };
}
