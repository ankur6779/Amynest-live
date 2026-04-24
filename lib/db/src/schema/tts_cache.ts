import { pgTable, text, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const ttsCacheTable = pgTable(
  "tts_cache",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    cacheKey: text("cache_key").notNull().unique(),
    text: text("text").notNull(),
    voiceId: varchar("voice_id", { length: 64 }).notNull(),
    modelId: varchar("model_id", { length: 64 }).notNull(),
    audioPath: text("audio_path").notNull(),
    contentType: varchar("content_type", { length: 32 }).notNull().default("audio/mpeg"),
    charCount: integer("char_count").notNull(),
    hitCount: integer("hit_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastAccessedAt: timestamp("last_accessed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    voiceIdx: index("tts_cache_voice_idx").on(table.voiceId),
    createdAtIdx: index("tts_cache_created_at_idx").on(table.createdAt),
  }),
);

export type TtsCacheRow = typeof ttsCacheTable.$inferSelect;
export type InsertTtsCache = typeof ttsCacheTable.$inferInsert;
