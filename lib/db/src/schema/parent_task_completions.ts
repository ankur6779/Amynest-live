import {
  pgTable,
  text,
  integer,
  serial,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Per-day, per-child checkmarks for the "Parent Tasks for Today" companion
 * shown under the routine carousel on the Today's Plan page. Each row marks
 * one Parent Task as done for one child on one calendar date — uncheck just
 * deletes the row. The unique index on (childId, date, taskKey) makes the
 * "set done" call idempotent so optimistic UI re-toggles never duplicate.
 *
 * The taskKey is the human-readable task string from
 * `PARENT_TASKS_BY_GROUP` in `@workspace/age-content` (truncated server-side
 * to fit the column). It's intentionally not a foreign key into a tasks
 * table because the source list is a static dataset that ships in the lib.
 */
export const parentTaskCompletionsTable = pgTable(
  "parent_task_completions",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id").notNull(),
    date: text("date").notNull(),
    taskKey: text("task_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    childDateTaskUniq: uniqueIndex("parent_task_completions_child_date_task_uniq").on(
      table.childId,
      table.date,
      table.taskKey,
    ),
  }),
);

export const insertParentTaskCompletionSchema = createInsertSchema(
  parentTaskCompletionsTable,
).omit({ id: true, createdAt: true });
export type InsertParentTaskCompletion = z.infer<
  typeof insertParentTaskCompletionSchema
>;
export type ParentTaskCompletion =
  typeof parentTaskCompletionsTable.$inferSelect;
