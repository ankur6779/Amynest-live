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

/** Per-user 7-day activation journey — sequential retention tasks after onboarding. */
export const userActivationJourneyTable = pgTable(
  "user_activation_journey",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** Calendar day the user is on (1–7). Becomes 8 when all days are done. */
    currentDay: integer("current_day").notNull().default(1),
    /** Completed day numbers, e.g. [1, 2, 3]. */
    completedDays: jsonb("completed_days").$type<number[]>().notNull().default([]),
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
    userUq: uniqueIndex("user_activation_journey_user_uq").on(t.userId),
    userIdx: index("user_activation_journey_user_idx").on(t.userId),
  }),
);

export type UserActivationJourney = typeof userActivationJourneyTable.$inferSelect;
export type InsertUserActivationJourney =
  typeof userActivationJourneyTable.$inferInsert;
