import { pgTable, text, integer, serial, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Parent feedback loop (Priority 1). Lightweight qualitative tags a parent
 * leaves on a routine or one of its activities. Lives ABOVE the frozen
 * routine generation engine — this table is write-only collection for now.
 *
 * activityKey is null for routine-level feedback (e.g. "bedtime_smooth").
 * The (childId, routineDate, activityKey) shape mirrors
 * routine_activity_outcomes so a future Phase C can feed the existing
 * outcome write-path without touching any frozen engine file.
 */
export const routineFeedbackTable = pgTable(
  "routine_feedback",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    routineId: integer("routine_id").notNull(),
    routineDate: text("routine_date").notNull(),
    activityKey: text("activity_key"),
    signal: text("signal").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childCreatedIdx: index("routine_feedback_child_created_idx").on(t.childId, t.createdAt),
    routineIdx: index("routine_feedback_routine_idx").on(t.routineId),
  }),
);

export const ROUTINE_FEEDBACK_SIGNALS = [
  "worked_well",
  "loved_this",
  "too_tiring",
  "skipped",
  "bedtime_smooth",
] as const;

export type RoutineFeedbackSignal = (typeof ROUTINE_FEEDBACK_SIGNALS)[number];

export const insertRoutineFeedbackSchema = createInsertSchema(routineFeedbackTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRoutineFeedback = z.infer<typeof insertRoutineFeedbackSchema>;
export type RoutineFeedback = typeof routineFeedbackTable.$inferSelect;
