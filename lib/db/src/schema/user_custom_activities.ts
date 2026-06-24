import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type CustomActivityWeekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const userCustomActivitiesTable = pgTable(
  "user_custom_activities",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    title: text("title").notNull(),
    category: text("category").notNull().default("activity"),
    daysOfWeek: jsonb("days_of_week").$type<CustomActivityWeekday[]>().notNull().default([]),
    startTime: text("start_time").notNull(),
    endTime: text("end_time").notNull(),
    location: text("location"),
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userChildIdx: index("user_custom_activities_user_child_idx").on(t.userId, t.childId),
    activeIdx: index("user_custom_activities_active_idx").on(t.userId, t.isActive),
  }),
);

export const insertUserCustomActivitySchema = createInsertSchema(userCustomActivitiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserCustomActivity = z.infer<typeof insertUserCustomActivitySchema>;
export type UserCustomActivity = typeof userCustomActivitiesTable.$inferSelect;
