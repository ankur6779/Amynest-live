import {
  pgTable,
  text,
  integer,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Append-only log of pronunciation-practice attempts. Each row represents one
 * tap of "I tried it" against a single prompt id from `@workspace/speech-coach`
 * (`PRONUNCIATION_PROMPTS`). `clarityScore` is nullable because real STT-based
 * scoring isn't shipped yet — for now it accepts a placeholder client-supplied
 * value (0-100) when the parent self-grades; null means "no rating".
 */
export const speechPracticeLogTable = pgTable("speech_practice_log", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  childId: integer("child_id").notNull(),
  promptId: text("prompt_id").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  clarityScore: integer("clarity_score"),
  parentNote: text("parent_note"),
});

export const insertSpeechPracticeLogSchema = createInsertSchema(
  speechPracticeLogTable,
).omit({ id: true, attemptedAt: true });
export type InsertSpeechPracticeLog = z.infer<
  typeof insertSpeechPracticeLogSchema
>;
export type SpeechPracticeLogRow = typeof speechPracticeLogTable.$inferSelect;
