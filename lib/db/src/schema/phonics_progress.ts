import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Per-child phonics progress: how many times each item has been played and
 * whether the parent has marked it mastered. Both `userId` and `childId`
 * are stored so we can authorise reads without a join in the hot path.
 */
export const phonicsProgressTable = pgTable(
  "phonics_progress",
  {
    id: serial("id").primaryKey(),
    /** FK → children.id (serial integer). */
    childId: integer("child_id").notNull(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** FK → phonics_content.id. Cascade not enforced — content is append-only. */
    contentId: integer("content_id").notNull(),
    playCount: integer("play_count").notNull().default(0),
    mastered: boolean("mastered").notNull().default(false),
    firstPlayedAt: timestamp("first_played_at", { withTimezone: true }),
    lastPlayedAt: timestamp("last_played_at", { withTimezone: true }),
    masteredAt: timestamp("mastered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childContentUq: uniqueIndex("phonics_progress_child_content_uq").on(
      t.childId,
      t.contentId,
    ),
    childIdx: index("phonics_progress_child_idx").on(t.childId),
    userIdx: index("phonics_progress_user_idx").on(t.userId),
  }),
);

export const insertPhonicsProgressSchema = createInsertSchema(
  phonicsProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type PhonicsProgressRow = typeof phonicsProgressTable.$inferSelect;
export type InsertPhonicsProgress = z.infer<typeof insertPhonicsProgressSchema>;
