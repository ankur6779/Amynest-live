import { pgTable, varchar, text, jsonb, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const coachWinGenerationsTable = pgTable(
  "coach_win_generations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    generationId: varchar("generation_id", { length: 64 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    userId: text("user_id").notNull(),
    cacheKey: text("cache_key").notNull(),
    input: jsonb("input").notNull(),
    planJson: jsonb("plan_json").notNull(),
    wins: jsonb("wins").notNull(),
    status: varchar("status", { length: 16 }).notNull(),
    source: varchar("source", { length: 32 }).notNull().default("amy_coach"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    generationUq: uniqueIndex("coach_win_generations_generation_uq").on(t.generationId),
    userIdx: index("coach_win_generations_user_idx").on(t.userId),
    sessionIdx: index("coach_win_generations_session_idx").on(t.sessionId),
    userSessionIdx: index("coach_win_generations_user_session_idx").on(t.userId, t.sessionId),
  }),
);

export type CoachWinGenerationRow = typeof coachWinGenerationsTable.$inferSelect;
export type InsertCoachWinGeneration = typeof coachWinGenerationsTable.$inferInsert;
