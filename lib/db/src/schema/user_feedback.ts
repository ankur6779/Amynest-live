import { pgTable, varchar, text, timestamp, integer, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userFeedbackTable = pgTable(
  "user_feedback",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull(),
    categories: text("categories").array().notNull().default(sql`'{}'::text[]`),
    message: text("message").notNull(),
    rating: integer("rating"),
    screenshotUrl: text("screenshot_url"),
    platform: varchar("platform", { length: 32 }),
    appVersion: varchar("app_version", { length: 32 }),
    deviceType: varchar("device_type", { length: 64 }),
    country: varchar("country", { length: 8 }),
    autoTags: text("auto_tags").array().default(sql`'{}'::text[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_feedback_user_idx").on(t.userId),
    createdAtIdx: index("user_feedback_created_at_idx").on(t.createdAt),
  })
);

export type UserFeedbackRow = typeof userFeedbackTable.$inferSelect;
export type InsertUserFeedback = typeof userFeedbackTable.$inferInsert;
