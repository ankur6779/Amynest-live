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
 * Spelling Mastery v2 — Tournament Mode (3-round elimination ladder).
 *
 * One tournament row owns up to 3 spelling_sessions rows (one per round).
 * Each round is a normal v2 server-graded session whose `mode` is set to
 * "tournament" — the same trust model as Competition (server picks the
 * words, server grades the typed guesses, client only ever holds an
 * opaque token).
 *
 * Round progression rules live in `applyRoundResult` on the API side
 * and are exercised by spelling.test.ts. The DB only stores the
 * post-state — the rules are not encoded as constraints.
 *
 * Status lifecycle:
 *   active     → currently playing some round in [1..3]
 *   eliminated → failed R1 or R2 (rounds[].passed = false)
 *   completed  → cleared all 3 rounds (R3 always counts toward total)
 */
export const spellingTournamentsTable = pgTable(
  "spelling_tournaments",
  {
    id: serial("id").primaryKey(),
    /** Opaque random token — the client's only handle on the tournament. */
    tournamentToken: text("tournament_token").notNull(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** FK → children.id */
    childId: integer("child_id").notNull(),
    /** "2-4" | "4-6" | "6-8" | "8-10+" */
    ageGroup: text("age_group").notNull(),
    /** "active" | "eliminated" | "completed" */
    status: text("status").notNull().default("active"),
    /** 1, 2, or 3. Stays at the round the player is currently on. */
    currentRound: integer("current_round").notNull().default(1),
    /**
     * Per-round results, appended when the round is finalized.
     * Sparse — entry N is only present once round N has been finalized.
     */
    rounds: jsonb("rounds")
      .$type<
        Array<{
          round: number;
          difficulty: "easy" | "medium" | "hard";
          sessionToken: string;
          score: number;
          wordsCorrect: number;
          wordsAttempted: number;
          durationSec: number;
          passed: boolean;
        }>
      >()
      .notNull()
      .default([]),
    /** Sum of rounds[].score across all completed rounds. */
    totalScore: integer("total_score").notNull().default(0),
    /** NULL unless the player was eliminated; otherwise the round (1 or 2) they failed. */
    eliminatedAtRound: integer("eliminated_at_round"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Stamped when status moves out of "active". */
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
  },
  (t) => ({
    tokenUq: uniqueIndex("spelling_tournaments_token_uq").on(t.tournamentToken),
    userChildIdx: index("spelling_tournaments_user_child_idx").on(
      t.userId,
      t.childId,
    ),
  }),
);

export const insertSpellingTournamentSchema = createInsertSchema(
  spellingTournamentsTable,
).omit({ id: true, startedAt: true });

export type SpellingTournamentRow =
  typeof spellingTournamentsTable.$inferSelect;
export type InsertSpellingTournament = z.infer<
  typeof insertSpellingTournamentSchema
>;
