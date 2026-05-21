import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Serialized daily plan per child per UTC date. */
export const phonicsDailyPlansTable = pgTable(
  "phonics_daily_plans",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    planDate: text("plan_date").notNull(),
    planJson: jsonb("plan_json").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childDateUq: uniqueIndex("phonics_daily_plans_child_date_uq").on(
      t.childId,
      t.planDate,
    ),
    userIdx: index("phonics_daily_plans_user_idx").on(t.userId),
  }),
);

export const insertPhonicsDailyPlanSchema = createInsertSchema(
  phonicsDailyPlansTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type PhonicsDailyPlanRow = typeof phonicsDailyPlansTable.$inferSelect;
export type InsertPhonicsDailyPlan = z.infer<typeof insertPhonicsDailyPlanSchema>;
