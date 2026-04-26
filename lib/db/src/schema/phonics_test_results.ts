import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Phonics Test results — one row per completed daily or weekly assessment.
 * Both `userId` and `childId` are stored so reads can be authorised without
 * a join. `weakConcepts` is the array of phonics_content.id values the
 * child got wrong, used to surface targeted practice.
 */
export const phonicsTestResultsTable = pgTable(
  "phonics_test_results",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    /** "daily" (5Q) or "weekly" (20Q). */
    testType: text("test_type").notNull(),
    /** Age tier the child was in when the test ran. */
    ageGroup: text("age_group").notNull(),
    /** Number of correct answers. */
    score: integer("score").notNull(),
    /** Total questions in the test. */
    total: integer("total").notNull(),
    /** Convenience: round(score/total * 100). */
    accuracyPct: integer("accuracy_pct").notNull(),
    /** "Beginner" | "Improving" | "Strong". */
    performanceLabel: text("performance_label").notNull(),
    /** phonics_content.id values answered incorrectly. */
    weakConcepts: jsonb("weak_concepts").$type<number[]>().notNull().default([]),
    /** Optional per-type accuracy snapshot (weekly tests). */
    typeBreakdown: jsonb("type_breakdown")
      .$type<Record<string, { correct: number; total: number }>>()
      .notNull()
      .default({}),
    /** Short message rendered on the result screen. */
    insightText: text("insight_text").notNull().default(""),
    /** Optional follow-up suggestion (e.g. "Practice blending words"). */
    insightSuggestion: text("insight_suggestion").notNull().default(""),
    /**
     * One-time-use session id (UUID) carried by the encrypted session token
     * issued at /tests/start. Recorded here on submit so the same token can
     * never be replayed to insert duplicate results. Nullable because legacy
     * rows pre-dating this column may not have it.
     */
    sessionJti: text("session_jti"),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childIdx: index("phonics_test_results_child_idx").on(t.childId),
    userIdx: index("phonics_test_results_user_idx").on(t.userId),
    childTypeIdx: index("phonics_test_results_child_type_idx").on(
      t.childId,
      t.testType,
      t.completedAt,
    ),
    /** Replay protection: a session JTI can only be consumed once per user. */
    sessionJtiUniqIdx: uniqueIndex("phonics_test_results_user_jti_uniq_idx").on(
      t.userId,
      t.sessionJti,
    ),
  }),
);

export const insertPhonicsTestResultSchema = createInsertSchema(
  phonicsTestResultsTable,
).omit({ id: true, createdAt: true });

export type PhonicsTestResultRow =
  typeof phonicsTestResultsTable.$inferSelect;
export type InsertPhonicsTestResult = z.infer<
  typeof insertPhonicsTestResultSchema
>;
