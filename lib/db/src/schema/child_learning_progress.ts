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
 * Per-child Smart Study Zone progress used by the adaptive daily-plan
 * engine. One row per (child, subject). Both userId and childId are
 * stored so reads can authorise without a join.
 *
 * `accuracyRecent` is a rolling window of the last 20 attempts (each item
 * is { topicId, correct, ts }) — small enough to keep as jsonb without
 * paying per-attempt SQL writes. Bigger analytics (parent dashboards,
 * trends) belong in a future events table; this one exists purely to
 * power tomorrow's plan.
 */
export const childLearningProgressTable = pgTable(
  "child_learning_progress",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    /** "math" | "english" | "gk" | "science" — see @workspace/study-zone. */
    subject: text("subject").notNull(),
    /** Last 20 attempts as { topicId, correct, ts }. */
    accuracyRecent: jsonb("accuracy_recent").notNull().default([]),
    /** Topic ids the child has answered <60% on recently. */
    weakTopics: jsonb("weak_topics").notNull().default([]),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childSubjectUq: uniqueIndex("child_learning_progress_child_subject_uq").on(
      t.childId,
      t.subject,
    ),
    childIdx: index("child_learning_progress_child_idx").on(t.childId),
    userIdx: index("child_learning_progress_user_idx").on(t.userId),
  }),
);

export const insertChildLearningProgressSchema = createInsertSchema(
  childLearningProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type ChildLearningProgressRow = typeof childLearningProgressTable.$inferSelect;
export type InsertChildLearningProgress = z.infer<typeof insertChildLearningProgressSchema>;

export type LearningAttempt = {
  topicId: string;
  correct: boolean;
  ts: string;
};
