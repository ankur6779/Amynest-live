import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * AI-generated phonics words/phrases — keyed for reuse (no repeat OpenAI calls).
 */
export const phonicsContentCacheTable = pgTable(
  "phonics_content_cache",
  {
    id: serial("id").primaryKey(),
    cacheKey: text("cache_key").notNull(),
    level: integer("level").notNull(),
    vowelFocus: text("vowel_focus"),
    words: jsonb("words").$type<string[]>().notNull().default([]),
    prompt: text("prompt").notNull().default(""),
    source: text("source").notNull().default("ai"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    cacheKeyUq: uniqueIndex("phonics_content_cache_key_uq").on(t.cacheKey),
    levelIdx: index("phonics_content_cache_level_idx").on(t.level),
  }),
);

export const insertPhonicsContentCacheSchema = createInsertSchema(
  phonicsContentCacheTable,
).omit({ id: true, createdAt: true });

export type PhonicsContentCacheRow = typeof phonicsContentCacheTable.$inferSelect;
export type InsertPhonicsContentCache = z.infer<
  typeof insertPhonicsContentCacheSchema
>;
