import { db, staticAudioRegistryTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  getStaticAudioHash,
  normalizeStaticAudioKey,
  type StaticAudioMode,
} from "@workspace/static-audio";
import { getShippedStaticAudioMap } from "../lib/static-audio-map.js";
import { logger } from "../lib/logger.js";

export type RegistryUpsert = {
  hash: string;
  text: string;
  mode: StaticAudioMode;
  audioUrl?: string | null;
  audioData?: Buffer | null;
  gcsPresent?: boolean;
  source?: string;
};

const hashIndex = new Map<string, { text: string; mode: StaticAudioMode }>();
let indexReady = false;

export function rebuildStaticHashIndex(): number {
  if (indexReady) return hashIndex.size;
  hashIndex.clear();
  const map = getShippedStaticAudioMap();
  for (const mode of ["default", "phonics"] as const) {
    for (const [key, url] of Object.entries(map[mode] ?? {})) {
      if (!url?.includes("static-audio/")) continue;
      const m = url.match(/static-audio\/([a-f0-9]{32})\.mp3/);
      if (!m) continue;
      hashIndex.set(m[1]!, { text: key, mode });
    }
  }
  indexReady = true;
  return hashIndex.size;
}

export function lookupPhraseByHash(hash: string): { text: string; mode: StaticAudioMode } | null {
  return hashIndex.get(hash) ?? null;
}

export async function getRegistryRow(hash: string) {
  const rows = await db
    .select()
    .from(staticAudioRegistryTable)
    .where(eq(staticAudioRegistryTable.hash, hash))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertRegistryRow(row: RegistryUpsert): Promise<void> {
  const normalizedKey = normalizeStaticAudioKey(row.text);
  await db
    .insert(staticAudioRegistryTable)
    .values({
      hash: row.hash,
      text: row.text,
      mode: row.mode,
      normalizedKey,
      audioUrl: row.audioUrl ?? null,
      audioData: row.audioData ?? null,
      gcsPresent: row.gcsPresent ?? false,
      source: row.source ?? "catalog",
    })
    .onConflictDoUpdate({
      target: staticAudioRegistryTable.hash,
      set: {
        text: row.text,
        mode: row.mode,
        normalizedKey,
        audioUrl: row.audioUrl ?? null,
        ...(row.audioData ? { audioData: row.audioData } : {}),
        gcsPresent: row.gcsPresent ?? false,
        source: row.source ?? "catalog",
        updatedAt: sql`now()`,
      },
    });
  hashIndex.set(row.hash, { text: row.text, mode: row.mode });
}

export async function recordRegistryMiss(hash: string): Promise<void> {
  try {
    await db
      .update(staticAudioRegistryTable)
      .set({ missCount: sql`${staticAudioRegistryTable.missCount} + 1`, updatedAt: sql`now()` })
      .where(eq(staticAudioRegistryTable.hash, hash));
  } catch (err) {
    logger.warn(
      { evt: "static_audio.registry_miss_update_failed", hash, err: String(err) },
      "registry miss bump failed",
    );
  }
}

export function registryHashForPhrase(text: string, mode: StaticAudioMode = "default"): string {
  return getStaticAudioHash(text.trim(), mode);
}
