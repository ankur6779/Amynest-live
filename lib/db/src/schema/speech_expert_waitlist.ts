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
 * "Connect with Certified Speech Experts" waitlist signup.
 *
 * Idempotent on (userId, childId) — the route uses `onConflictDoNothing`
 * so a parent tapping the button twice doesn't create duplicate rows.
 * `childId` is nullable for the case where a parent expresses interest
 * before they've selected a specific child; because Postgres treats NULL
 * values as distinct in a unique index, the route also does an explicit
 * lookup for the (userId, NULL) case to keep that path idempotent too.
 *
 * No emails / SMS are sent today — this is a passive list the team can
 * export when the expert program launches.
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
    userChildUq: uniqueIndex("speech_expert_waitlist_user_child_uq").on(
      table.userId,
      table.childId,
    ),
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
