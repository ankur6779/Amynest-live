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
 * Server-verified spelling sessions (Spelling Mastery v2 trust model).
 *
 * The server is the source of truth for what was asked and what was
 * answered. At session start the server picks the words and remembers
 * them in `words` (jsonb). The client only ever receives an opaque
 * `sessionToken` plus per-word audio URLs — never the answers.
 *
 * Each per-word answer is POSTed back with the typed guess; the server
 * grades it against its stored copy and records the result in
 * `attempts` (sparse map keyed by word index → { guess, correct, ts }).
 *
 * Used by Competition + Dictation modes. Learn / Practice / Parent
 * stay on the legacy `POST /spelling/progress` endpoint with a
 * `source` field that explicitly tags the trust model.
 */
export const spellingSessionsTable = pgTable(
  "spelling_sessions",
  {
    id: serial("id").primaryKey(),
    /** Opaque random token — the client's only handle on the session. */
    sessionToken: text("session_token").notNull(),
    /** FK → children.id */
    childId: integer("child_id").notNull(),
    /** Owner — every read filters on this for auth. */
    userId: text("user_id").notNull(),
    /** "2-4" | "4-6" | "6-8" | "8-10+" */
    ageGroup: text("age_group").notNull(),
    /** "competition" | "dictation" | "tournament" | "battle" */
    mode: text("mode").notNull(),
    /** "easy" | "medium" | "hard" */
    difficulty: text("difficulty").notNull(),
    /**
     * Server-stored word objects WITH answers. NEVER serialized verbatim
     * to the client — only safe projections are returned (id + audio).
     */
    words: jsonb("words")
      .$type<
        Array<{
          id: string;
          word: string;
          ageGroup: string;
          difficulty: string;
          syllables: string[];
          chunks: string[];
          hint: string;
        }>
      >()
      .notNull(),
    /**
     * ElevenLabs cache keys parallel to `words`. Used by the public
     * audio proxy to stream the MP3 for a given word index without
     * exposing the cache key (which is a hash of the word text).
     */
    audioKeys: jsonb("audio_keys").$type<string[]>().notNull(),
    /**
     * Per-word results keyed by word index (string for JSON safety):
     *   { "0": { guess: "ship", correct: true, ts: "2025-..." }, ... }
     * Sparse — only filled in as the child submits each attempt.
     */
    attempts: jsonb("attempts")
      .$type<Record<string, { guess: string; correct: boolean; ts: string }>>()
      .notNull()
      .default({}),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** NULL until /finalize is called. Subsequent finalize calls are idempotent. */
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    /** Final competition score (server-computed at finalize). NULL for non-competition. */
    finalScore: integer("final_score"),
    /** Run duration in seconds — server-computed (now - startedAt) at finalize. */
    finalDurationSec: integer("final_duration_sec"),
    finalWordsAttempted: integer("final_words_attempted"),
    finalWordsCorrect: integer("final_words_correct"),
    /** FK → spelling_competition_scores.id once a leaderboard row is written. */
    competitionScoreId: integer("competition_score_id"),
    /**
     * Tournament linkage — set when this session is one round of a
     * tournament. NULL otherwise. Lets the server look up the parent
     * tournament when /tournaments/:token/advance is called without
     * the client having to pass both tokens.
     */
    parentTournamentToken: text("parent_tournament_token"),
    /**
     * Battle Mode — opponent strength. NULL unless `mode === "battle"`.
     * One of: "ai_easy" | "ai_medium" | "ai_hard".
     */
    aiOpponent: text("ai_opponent"),
    /**
     * Per-word AI simulation result. Computed once at session start with
     * a seeded RNG keyed on `sessionToken` so the AI's behaviour is
     * fixed and not tamperable from the client. Parallel to `words`.
     *   [{ correct: bool, ms: number }, ...]
     */
    aiResults: jsonb("ai_results").$type<
      Array<{ correct: boolean; ms: number }>
    >(),
    /** Final AI score (server-computed at finalize). NULL for non-battle. */
    aiFinalScore: integer("ai_final_score"),
  },
  (t) => ({
    tokenUq: uniqueIndex("spelling_sessions_token_uq").on(t.sessionToken),
    userChildIdx: index("spelling_sessions_user_child_idx").on(
      t.userId,
      t.childId,
    ),
  }),
);

export const insertSpellingSessionSchema = createInsertSchema(
  spellingSessionsTable,
).omit({ id: true, startedAt: true });

export type SpellingSessionRow = typeof spellingSessionsTable.$inferSelect;
export type InsertSpellingSession = z.infer<typeof insertSpellingSessionSchema>;
