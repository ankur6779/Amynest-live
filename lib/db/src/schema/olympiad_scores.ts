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
 * Append-only olympiad run scores. Each daily / weekly / mock / track
 * completion writes one row so family + global leaderboards can aggregate
 * weekly points per child.
 */
export const olympiadScoresTable = pgTable(
  "olympiad_scores",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    /** "tiny" | "junior" | "senior */
    ageBand: text("age_band").notNull(),
    /** daily | weekly | practice | mock | track */
    runType: text("run_type").notNull(),
    /** nso | math_olympiad | gk_olympiad — set for track runs only */
    trackId: text("track_id"),
    questionsAttempted: integer("questions_attempted").notNull(),
    questionsCorrect: integer("questions_correct").notNull(),
    accuracyPct: integer("accuracy_pct").notNull(),
    durationSec: integer("duration_sec").notNull(),
    /** Server-computed leaderboard points for this run. */
    score: integer("score").notNull(),
    /** Monday ISO date (UTC) of the week this run counts toward. */
    weekStart: text("week_start").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userAgeWeekIdx: index("olympiad_user_age_week_idx").on(
      t.userId,
      t.ageBand,
      t.weekStart,
    ),
    childIdx: index("olympiad_child_idx").on(t.childId),
    globalWeekIdx: index("olympiad_global_week_idx").on(t.ageBand, t.weekStart),
  }),
);

export const insertOlympiadScoreSchema = createInsertSchema(
  olympiadScoresTable,
).omit({ id: true, createdAt: true });

export type OlympiadScoreRow = typeof olympiadScoresTable.$inferSelect;
export type InsertOlympiadScore = z.infer<typeof insertOlympiadScoreSchema>;
