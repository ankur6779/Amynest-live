import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Per-child nutrition daily check-in — one row per (childId, dateKey).
 * Mirrors the Nutrition Hub track checklist persisted from mobile/web.
 */
export const nutritionDailyLogTable = pgTable(
  "nutrition_daily_log",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    /** YYYY-MM-DD in the child's local calendar when saved. */
    dateKey: text("date_key").notNull(),
    checklist: jsonb("checklist").$type<Record<string, boolean>>().notNull().default({}),
    score: integer("score").notNull().default(0),
    /** True when the minimum daily check-in threshold was met. */
    minDayMet: boolean("min_day_met").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childDateUq: uniqueIndex("nutrition_daily_log_child_date_uq").on(t.childId, t.dateKey),
    userIdx: index("nutrition_daily_log_user_idx").on(t.userId),
    childIdx: index("nutrition_daily_log_child_idx").on(t.childId),
  }),
);

export const insertNutritionDailyLogSchema = createInsertSchema(nutritionDailyLogTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NutritionDailyLogRow = typeof nutritionDailyLogTable.$inferSelect;
export type InsertNutritionDailyLog = z.infer<typeof insertNutritionDailyLogSchema>;
