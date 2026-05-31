import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

/** Long-term Amy Coach family memory + hidden coaching profile (per user). */
export const userCoachIntelligenceTable = pgTable("user_coach_intelligence", {
  userId: text("user_id").primaryKey(),
  snapshot: jsonb("snapshot").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserCoachIntelligenceRow = typeof userCoachIntelligenceTable.$inferSelect;
export type InsertUserCoachIntelligence = typeof userCoachIntelligenceTable.$inferInsert;
