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

export interface CoachPlanRecordRow {
  goalId: string;
  sessionId: string;
  journeyDay: number;
  completedAt: string;
}

/** Amy Coach 3-day guided journey — free period before paywall. */
export const coachJourneyTable = pgTable(
  "coach_journey",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** Completed journey day numbers, e.g. [1, 2, 3]. */
    completedDays: jsonb("completed_days").$type<number[]>().notNull().default([]),
    /** Next day to complete (1–3 while free; 4 when free quota exhausted). */
    currentDay: integer("current_day").notNull().default(1),
    /** Plans completed during the free journey. */
    plansCompleted: jsonb("plans_completed")
      .$type<CoachPlanRecordRow[]>()
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
    userUq: uniqueIndex("coach_journey_user_uq").on(t.userId),
    userIdx: index("coach_journey_user_idx").on(t.userId),
  }),
);

export type CoachJourney = typeof coachJourneyTable.$inferSelect;
export type InsertCoachJourney = typeof coachJourneyTable.$inferInsert;
