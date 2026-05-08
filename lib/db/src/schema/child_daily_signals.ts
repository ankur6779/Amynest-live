import { pgTable, text, integer, serial, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Adaptive Family Intelligence — daily behavioral signals captured per child.
 *
 * One row per (childId, date). Used to:
 *   1. Derive the child's energy profile (peak focus / low energy windows)
 *   2. Provide previous-day context to the routine generator
 *   3. Track outcome trends (sleep improving? tantrums decreasing?)
 *
 * All numeric scores are 1–5 scales (5 = best). completionPct is 0–100.
 * Fields are nullable so parents can log only what they observed.
 */
export const childDailySignalsTable = pgTable(
  "child_daily_signals",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD local date
    mood: integer("mood"), // 1=very fussy … 5=very happy
    focusScore: integer("focus_score"), // 1=scattered … 5=very focused
    sleepQuality: integer("sleep_quality"), // 1=poor … 5=great
    completionPct: integer("completion_pct"), // 0–100 of yesterday's routine done
    screenMinutes: integer("screen_minutes"), // total minutes of screens that day
    tantrumCount: integer("tantrum_count").notNull().default(0),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childDateIdx: uniqueIndex("child_daily_signals_child_date_idx").on(t.childId, t.date),
  }),
);

export const insertChildDailySignalSchema = createInsertSchema(childDailySignalsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChildDailySignal = z.infer<typeof insertChildDailySignalSchema>;
export type ChildDailySignal = typeof childDailySignalsTable.$inferSelect;
