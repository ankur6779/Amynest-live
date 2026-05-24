import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export interface RoutineGenerationRecordRow {
  childId: number;
  date: string;
  journeyDay: number;
  completedAt: string;
}

/** Routine 3-day guided journey — free period before paywall. */
export const routineJourneyTable = pgTable(
  "routine_journey",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** Completed journey day numbers, e.g. [1, 2, 3]. */
    completedDays: jsonb("completed_days").$type<number[]>().notNull().default([]),
    /** Next day to complete (1–3 while free; 4 when free quota exhausted). */
    currentDay: integer("current_day").notNull().default(1),
    /** Generations completed during the free journey. */
    generationsCompleted: jsonb("generations_completed")
      .$type<RoutineGenerationRecordRow[]>()
      .notNull()
      .default([]),
    /** ISO timestamps keyed by day number string. */
    dayCompletedAt: jsonb("day_completed_at")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userUq: uniqueIndex("routine_journey_user_uq").on(t.userId),
    userIdx: index("routine_journey_user_idx").on(t.userId),
  }),
);

export type RoutineJourney = typeof routineJourneyTable.$inferSelect;
export type InsertRoutineJourney = typeof routineJourneyTable.$inferInsert;
