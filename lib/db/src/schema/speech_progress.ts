import {
  pgTable,
  text,
  integer,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Per-child Speech Coach milestone status. One row per (childId, milestoneId).
 *
 * `milestoneId` is the human-readable id from `@workspace/speech-coach`
 * (e.g. "m_2y_two_word"). It's intentionally NOT a foreign key into a
 * milestones table because the source list is a static dataset that ships in
 * the lib. The unique index on (childId, milestoneId) makes upsert idempotent.
 *
 * `status` is one of: "on_track" | "needs_attention" | "consult_expert".
 */
export const speechProgressTable = pgTable(
  "speech_progress",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id").notNull(),
    milestoneId: text("milestone_id").notNull(),
    status: text("status").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    childMilestoneUniq: uniqueIndex(
      "speech_progress_child_milestone_uniq",
    ).on(table.childId, table.milestoneId),
  }),
);

export const insertSpeechProgressSchema = createInsertSchema(
  speechProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSpeechProgress = z.infer<typeof insertSpeechProgressSchema>;
export type SpeechProgressRow = typeof speechProgressTable.$inferSelect;
