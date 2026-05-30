import {
  customType,
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

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

/**
 * Permanent index for pre-generated phonics library assets (ElevenLabs → GCS).
 * Runtime playback resolves URLs from manifest + this table — never live TTS.
 */
export const phonicsAudioAssetsTable = pgTable(
  "phonics_audio_assets",
  {
    /** Stable id: letter_a, digraph_sh, cvc_cat, quiz_which_word_says_ship */
    id: varchar("id", { length: 128 }).primaryKey(),
    type: varchar("type", { length: 32 }).notNull(),
    text: text("text").notNull(),
    phoneme: text("phoneme"),
    alternatePhoneme: text("alternate_phoneme"),
    difficulty: integer("difficulty"),
    curriculumLevel: integer("curriculum_level"),
    gcsPath: text("gcs_path").notNull(),
    publicUrl: text("public_url"),
    durationMs: integer("duration_ms"),
    checksum: varchar("checksum", { length: 64 }),
    version: integer("version").notNull().default(1),
    source: varchar("source", { length: 32 }).notNull().default("elevenlabs"),
    quality: varchar("quality", { length: 16 }).notNull().default("auto"),
    audioData: bytea("audio_data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index("phonics_audio_assets_type_idx").on(table.type),
    gcsPathIdx: index("phonics_audio_assets_gcs_path_idx").on(table.gcsPath),
    curriculumIdx: index("phonics_audio_assets_curriculum_idx").on(table.curriculumLevel),
  }),
);

export type PhonicsAudioAssetRow = typeof phonicsAudioAssetsTable.$inferSelect;
export type InsertPhonicsAudioAsset = typeof phonicsAudioAssetsTable.$inferInsert;
