import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Maps Amy Coach plan win → shared TTS bytes (global reuse across users). */
export const coachAudioCacheTable = pgTable(
  "coach_audio_cache",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    /** SHA1 plan key from coach inputs (goal, age, topic answers, …). */
    planCacheKey: text("plan_cache_key").notNull(),
    winIndex: integer("win_index").notNull(),
    /** Verbatim listen text shown in UI — audit + integrity checks. */
    text: text("text").notNull(),
    /** SHA256 hex of listen text — detects plan drift at same win index. */
    textHash: varchar("text_hash", { length: 64 }).notNull(),
    /** Foreign key into tts_cache.cache_key (MP3 bytes). */
    ttsCacheKey: text("tts_cache_key").notNull(),
    /** Public playback path (/api/tts/audio/{ttsCacheKey}.mp3). */
    audioUrl: text("audio_url"),
    charCount: integer("char_count").notNull(),
    hitCount: integer("hit_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    planWinUq: uniqueIndex("coach_audio_cache_plan_win_uq").on(
      table.planCacheKey,
      table.winIndex,
    ),
    planIdx: index("coach_audio_cache_plan_idx").on(table.planCacheKey),
    ttsIdx: index("coach_audio_cache_tts_idx").on(table.ttsCacheKey),
  }),
);

export type CoachAudioCacheRow = typeof coachAudioCacheTable.$inferSelect;
export type InsertCoachAudioCache = typeof coachAudioCacheTable.$inferInsert;
