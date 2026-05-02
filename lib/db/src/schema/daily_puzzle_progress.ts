import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Per-child Daily Puzzle progress for a given calendar day.
 *
 * One row per (childId, date). Mirrors the in-memory state the mobile
 * `DailyPuzzle` component used to keep purely in AsyncStorage so that
 * the same child's progress (current question, streaks, ramped
 * difficulty, used puzzle ids) follows them across devices.
 *
 * Both `userId` and `childId` are denormalised so reads can authorise
 * without joining children → parent_profiles.
 */
export const dailyPuzzleProgressTable = pgTable(
  "daily_puzzle_progress",
  {
    id: serial("id").primaryKey(),
    /** FK → children.id */
    childId: integer("child_id").notNull(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** YYYY-MM-DD, the calendar date this row tracks. */
    date: text("date").notNull(),
    /** "easy" | "medium" | "hard" — current (ramped) difficulty. */
    difficulty: text("difficulty").notNull(),
    /** Consecutive-correct streak across the day. */
    correctStreak: integer("correct_streak").notNull().default(0),
    /** Consecutive-wrong streak across the day. */
    wrongStreak: integer("wrong_streak").notNull().default(0),
    /** Cumulative puzzle ids the child has answered today. */
    usedIds: jsonb("used_ids").$type<string[]>().notNull().default([]),
    /** The 5 puzzle ids picked for the *current* session, in order. */
    sessionPuzzleIds: jsonb("session_puzzle_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    /**
     * Per-question results for the current session (length matches
     * `sessionPuzzleIds`). `true` = correct, `false` = wrong, `null` =
     * not yet answered. Drives "resume at next unanswered question".
     */
    results: jsonb("results")
      .$type<(boolean | null)[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childDateUq: uniqueIndex("daily_puzzle_progress_child_date_uq").on(
      t.childId,
      t.date,
    ),
    userIdx: index("daily_puzzle_progress_user_idx").on(t.userId),
  }),
);

export const insertDailyPuzzleProgressSchema = createInsertSchema(
  dailyPuzzleProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type DailyPuzzleProgressRow =
  typeof dailyPuzzleProgressTable.$inferSelect;
export type InsertDailyPuzzleProgress = z.infer<
  typeof insertDailyPuzzleProgressSchema
>;
