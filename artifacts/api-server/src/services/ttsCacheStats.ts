import { db, ttsCacheTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ttsStorageBackend } from "./ttsAudioStore";

export interface TtsCacheStats {
  totalAudios: number;
  lastSaved: string | null;
  /** Rows in tts_cache (metadata), including legacy GCS-only rows. */
  totalEntries: number;
  /** Rows with MP3 bytes in Postgres bytea. */
  withPostgresBytes: number;
  storageBackend: ReturnType<typeof ttsStorageBackend>;
}

/** Aggregate TTS cache usage for health checks (no user-specific data). */
export async function getTtsCacheStats(): Promise<TtsCacheStats> {
  const [row] = await db
    .select({
      totalEntries: sql<number>`count(*)::int`,
      withPostgresBytes: sql<number>`count(*) filter (
        where ${ttsCacheTable.audioData} is not null
        and octet_length(${ttsCacheTable.audioData}) > 0
      )::int`,
      lastSaved: sql<Date | null>`max(${ttsCacheTable.createdAt})`,
    })
    .from(ttsCacheTable);

  const withBytes = row?.withPostgresBytes ?? 0;
  const totalEntries = row?.totalEntries ?? 0;
  const backend = ttsStorageBackend();

  return {
    totalAudios: backend === "postgres" ? withBytes : totalEntries,
    lastSaved: row?.lastSaved ? row.lastSaved.toISOString() : null,
    totalEntries,
    withPostgresBytes: withBytes,
    storageBackend: backend,
  };
}
