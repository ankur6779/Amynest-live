import {
  customType,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const bytea = customType<{ data: Buffer | null }>({
  dataType() {
    return "bytea";
  },
  fromDriver(value: unknown): Buffer | null {
    if (value == null) return null;
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    return Buffer.from(String(value));
  },
  toDriver(value: Buffer | null): Buffer | null {
    return value;
  },
});

/** Permanent store for pre-generated static phrase audio (hash = MD5(mode + text)). */
export const staticAudioRegistryTable = pgTable(
  "static_audio_registry",
  {
    hash: varchar("hash", { length: 32 }).primaryKey(),
    text: text("text").notNull(),
    mode: varchar("mode", { length: 16 }).notNull().default("default"),
    normalizedKey: text("normalized_key").notNull(),
    audioUrl: text("audio_url"),
    audioData: bytea("audio_data"),
    contentType: varchar("content_type", { length: 32 }).notNull().default("audio/mpeg"),
    gcsPresent: boolean("gcs_present").notNull().default(false),
    /** catalog | runtime | missing_report | corpus_scan */
    source: varchar("source", { length: 32 }).notNull().default("catalog"),
    missCount: integer("miss_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    normalizedIdx: index("static_audio_registry_normalized_idx").on(
      table.normalizedKey,
      table.mode,
    ),
    missIdx: index("static_audio_registry_miss_idx").on(table.missCount),
  }),
);

export type StaticAudioRegistryRow = typeof staticAudioRegistryTable.$inferSelect;
export type InsertStaticAudioRegistry = typeof staticAudioRegistryTable.$inferInsert;
