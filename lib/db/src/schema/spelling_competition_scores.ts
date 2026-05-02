import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * One row per completed Spelling Competition run. Append-only — every run
 * is recorded so the leaderboard can show the family's best efforts and
 * we can audit progression over time.
 *
 * Score = `correct * 100` (base) + speed bonus, computed on the server in
 * the route handler (clients can't be trusted with score formulas).
 */
export const spellingCompetitionScoresTable = pgTable(
  "spelling_competition_scores",
  {
    id: serial("id").primaryKey(),
    /** FK → children.id */
    childId: integer("child_id").notNull(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** "2-4" | "4-6" | "6-8" | "8-10+" */
    ageGroup: text("age_group").notNull(),
    /** Total words attempted in the run (typically 10). */
    wordsAttempted: integer("words_attempted").notNull(),
    /** Of those, how many were spelled correctly. */
    wordsCorrect: integer("words_correct").notNull(),
    /** Whole-number accuracy 0..100. */
    accuracyPct: integer("accuracy_pct").notNull(),
    /** Total elapsed seconds for the run (server-clamped to >= 1). */
    durationSec: integer("duration_sec").notNull(),
    /** Final score (server-computed). */
    score: integer("score").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userAgeIdx: index("spelling_comp_user_age_idx").on(t.userId, t.ageGroup),
    childIdx: index("spelling_comp_child_idx").on(t.childId),
  }),
);

export const insertSpellingCompetitionScoreSchema = createInsertSchema(
  spellingCompetitionScoresTable,
).omit({ id: true, createdAt: true });

export type SpellingCompetitionScoreRow =
  typeof spellingCompetitionScoresTable.$inferSelect;
export type InsertSpellingCompetitionScore = z.infer<
  typeof insertSpellingCompetitionScoreSchema
>;
