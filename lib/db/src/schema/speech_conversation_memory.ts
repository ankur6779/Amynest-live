import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/** Per-word running stats the live talk bot tracks across sessions. */
export interface ConversationWordStat {
  word: string;
  bestScore: number;
  lastScore: number;
  attempts: number;
}

/**
 * Cross-device memory for the Amy Live Speech Coach "talk bot".
 *
 * One row per (user, child). Lets Amy remember how each child speaks and how
 * much progress they've made, so the next session continues from the last and
 * keeps getting better — on any device the parent signs into.
 */
export const speechConversationMemoryTable = pgTable(
  "speech_conversation_memory",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id").notNull(),
    /** How many live talk sessions have been completed. */
    totalSessions: integer("total_sessions").notNull().default(0),
    /** UTC date (YYYY-MM-DD) of the most recent completed session. */
    lastSessionDate: text("last_session_date"),
    /** One-line kid-friendly summary of the last session. */
    lastSummary: text("last_summary"),
    /** What Amy planned to work on next time. */
    lastNextFocus: text("last_next_focus"),
    /** Tricky words/sounds to gently target in the next session. */
    targetSounds: jsonb("target_sounds").$type<string[]>().notNull().default([]),
    /** Words the child says clearly (celebrate, don't over-drill). */
    masteredWords: jsonb("mastered_words").$type<string[]>().notNull().default([]),
    /** Running per-word clarity stats keyed by lowercase word. */
    wordStats: jsonb("word_stats")
      .$type<Record<string, ConversationWordStat>>()
      .notNull()
      .default({}),
    /** Rolling overall clarity 0-100 (EMA) — drives Amy's tone/difficulty. */
    clarityAvg: integer("clarity_avg"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("speech_convo_memory_child_uq").on(t.userId, t.childId),
    userIdx: index("speech_convo_memory_user_idx").on(t.userId),
  }),
);

export type SpeechConversationMemory = typeof speechConversationMemoryTable.$inferSelect;
export type InsertSpeechConversationMemory = typeof speechConversationMemoryTable.$inferInsert;
