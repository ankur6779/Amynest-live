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
 * Waitlist for the upcoming "Connect with Certified Speech Experts" program.
 * One row per user (the unique index on userId makes the join-waitlist call
 * idempotent — the API just upserts notes / childId on subsequent calls
 * without creating duplicate rows). `childId` is nullable because the parent
 * may want to be notified before they've added a child profile.
 */
export const speechExpertWaitlistTable = pgTable(
  "speech_expert_waitlist",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    notes: text("notes"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userUniq: uniqueIndex("speech_expert_waitlist_user_uniq").on(table.userId),
  }),
);

export const insertSpeechExpertWaitlistSchema = createInsertSchema(
  speechExpertWaitlistTable,
).omit({ id: true, joinedAt: true });
export type InsertSpeechExpertWaitlist = z.infer<
  typeof insertSpeechExpertWaitlistSchema
>;
export type SpeechExpertWaitlistRow =
  typeof speechExpertWaitlistTable.$inferSelect;
