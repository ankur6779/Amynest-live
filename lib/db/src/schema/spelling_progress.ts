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
 * Per-child spelling progress for the Spelling Mastery module.
 *
 * One row per (childId, ageGroup). Tracks lifetime accuracy + the gamified
 * progression state (stars / level / badges / streak) used by the UI.
 *
 * Both `userId` and `childId` are denormalised so reads can authorise
 * without joining children → parent_profiles.
 */
export const spellingProgressTable = pgTable(
  "spelling_progress",
  {
    id: serial("id").primaryKey(),
    /** FK → children.id */
    childId: integer("child_id").notNull(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** "2-4" | "4-6" | "6-8" | "8-10+" */
    ageGroup: text("age_group").notNull(),
    /** Lifetime correct attempts across all modes. */
    totalCorrect: integer("total_correct").notNull().default(0),
    /** Lifetime total attempts (correct + wrong). */
    totalAttempts: integer("total_attempts").notNull().default(0),
    /** Total stars earned (1 star per correct word, +bonus for streaks). */
    totalStars: integer("total_stars").notNull().default(0),
    /** 1..N — bumps every 10 stars. Drives the difficulty ramp. */
    currentLevel: integer("current_level").notNull().default(1),
    /** Current consecutive-correct streak (resets on wrong answer). */
    currentStreak: integer("current_streak").notNull().default(0),
    /** Longest streak ever. */
    bestStreak: integer("best_streak").notNull().default(0),
    /** Earned badge ids — array of strings, e.g. ["first_word","streak_10"]. */
    badges: jsonb("badges").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childAgeUq: uniqueIndex("spelling_progress_child_age_uq").on(
      t.childId,
      t.ageGroup,
    ),
    userIdx: index("spelling_progress_user_idx").on(t.userId),
  }),
);

export const insertSpellingProgressSchema = createInsertSchema(
  spellingProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type SpellingProgressRow = typeof spellingProgressTable.$inferSelect;
export type InsertSpellingProgress = z.infer<typeof insertSpellingProgressSchema>;
