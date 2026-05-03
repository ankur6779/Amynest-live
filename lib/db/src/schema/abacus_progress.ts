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
 * Per-child progress for the Parent Hub "Abacus PRO Zone" learning module.
 * One row per child — small enough that we keep best-scores and the list of
 * completed levels in a single jsonb blob to avoid per-level joins on the
 * hot read path. Both `userId` and `childId` are stored so we can authorise
 * reads without joining `children`.
 */
export const abacusProgressTable = pgTable(
  "abacus_progress",
  {
    id: serial("id").primaryKey(),
    /** FK → children.id (serial integer). */
    childId: integer("child_id").notNull(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** Highest level the child has currently played up to (1..5). */
    currentLevel: integer("current_level").notNull().default(1),
    /** "learn" | "practice" | "challenge" | "mental" | "tutor" — last
     *  sub-mode the child opened, used to resume the UI on next visit. */
    lastMode: text("last_mode").notNull().default("learn"),
    /**
     * List of level ids (1..5) the child has passed at least once. Stored
     * as JSON because the array is tiny and we never query individual
     * elements in SQL — the client pulls the whole row and reasons about
     * unlocks via @workspace/abacus.
     */
    completedLevels: jsonb("completed_levels").notNull().default([]),
    /**
     * Best score per level: { "1": { points, accuracyPct, completedAt } }.
     * Same reasoning as `completedLevels` — small payload, never queried
     * field-by-field in SQL.
     */
    bestScores: jsonb("best_scores").notNull().default({}),
    /** Cumulative correct answers across all sessions. */
    totalCorrect: integer("total_correct").notNull().default(0),
    /** Cumulative attempts across all sessions. */
    totalAttempts: integer("total_attempts").notNull().default(0),
    /** Cumulative challenge points the child has earned. */
    totalPoints: integer("total_points").notNull().default(0),
    /**
     * Points earned in the current weekly leaderboard window. Reset to 0
     * by `log_session` whenever `weekStartedAt` is older than the current
     * Monday-00:00-UTC boundary. The leaderboard endpoint also treats a
     * stale `weekStartedAt` as 0 so reads never depend on a write to reset.
     */
    weeklyPoints: integer("weekly_points").notNull().default(0),
    /** ISO timestamp of the Monday (00:00 UTC) of the active leaderboard week. */
    weekStartedAt: timestamp("week_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("abacus_progress_child_uq").on(t.childId),
    userIdx: index("abacus_progress_user_idx").on(t.userId),
  }),
);

export const insertAbacusProgressSchema = createInsertSchema(
  abacusProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type AbacusProgressRow = typeof abacusProgressTable.$inferSelect;
export type InsertAbacusProgress = z.infer<typeof insertAbacusProgressSchema>;

/** Strongly-typed view of the jsonb `bestScores` column. */
export type AbacusBestScores = Record<
  string,
  { points: number; accuracyPct: number; completedAt: string }
>;
