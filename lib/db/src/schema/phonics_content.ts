import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Static phonics catalog (letters, sounds, CVC words, sentences, short stories).
 * Five `age_group` tiers cover 12 months → 6 years. The seed script is the
 * source of truth for the contents — never edit rows by hand.
 */
export const phonicsContentTable = pgTable(
  "phonics_content",
  {
    id: serial("id").primaryKey(),
    /** "12_24m" | "2_3y" | "3_4y" | "4_5y" | "5_6y" */
    ageGroup: varchar("age_group", { length: 16 }).notNull(),
    /** Sort order within an age group (1, 2, 3 …) — drives daily picks. */
    level: integer("level").notNull(),
    /** "sound" | "letter" | "word" | "sentence" | "story" — drives renderer. */
    type: varchar("type", { length: 16 }).notNull(),
    /** Display glyph: "A", "Moo", "cat", "The cat is fat.", etc. */
    symbol: text("symbol").notNull(),
    /** Exact text fed to ElevenLabs TTS (e.g. "A says ah" or "c. a. t. cat."). */
    sound: text("sound").notNull(),
    /** Optional caption: example word, blend hint, or comprehension prompt. */
    example: text("example"),
    /** Optional emoji used as a visual aid in tiles. */
    emoji: text("emoji"),
    /** Short caption shown under the tile ("Cow says…", "Sight word"). */
    hint: text("hint"),
    /**
     * Optional concept identifier — groups items that teach the same concept
     * across age tiers (e.g. all "letter-A" rows share `concept_id = "letter_a"`).
     * The Parent Hub Section 2 uses this to surface the "next-higher level
     * per concept" for age-2+ children. `null` means the item is not part of
     * a tracked concept progression.
     */
    conceptId: text("concept_id"),
    /**
     * Optional pre-generated audio URL. Left null for now — the frontend
     * synthesises on demand and the server-side ElevenLabs cache means each
     * unique sound is generated exactly once across the whole user base.
     */
    audioUrl: text("audio_url"),
    /** Soft-delete / staging flag — only `active = true` rows are served. */
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // Idempotent seeding key: same age_group + level + symbol = same row.
    ageLevelSymbolUq: uniqueIndex("phonics_content_age_level_symbol_uq").on(
      t.ageGroup,
      t.level,
      t.symbol,
    ),
    ageActiveLevelIdx: index("phonics_content_age_active_level_idx").on(
      t.ageGroup,
      t.active,
      t.level,
    ),
  }),
);

export const insertPhonicsContentSchema = createInsertSchema(
  phonicsContentTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type PhonicsContentRow = typeof phonicsContentTable.$inferSelect;
export type InsertPhonicsContent = z.infer<typeof insertPhonicsContentSchema>;
