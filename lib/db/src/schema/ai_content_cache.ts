import {
  pgTable,
  text,
  jsonb,
  timestamp,
  varchar,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** Shared pool of AI-generated learning content reusable across users. */
export const aiContentCacheTable = pgTable(
  "ai_content_cache",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    namespace: varchar("namespace", { length: 64 }).notNull(),
    lookupKey: text("lookup_key").notNull(),
    items: jsonb("items").notNull(),
    source: text("source").notNull().default("ai"),
    hitCount: integer("hit_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    nsLookupIdx: index("ai_content_cache_ns_lookup_idx").on(
      table.namespace,
      table.lookupKey,
    ),
    createdAtIdx: index("ai_content_cache_created_at_idx").on(table.createdAt),
  }),
);

export type AiContentCacheRow = typeof aiContentCacheTable.$inferSelect;
export type InsertAiContentCache = typeof aiContentCacheTable.$inferInsert;
