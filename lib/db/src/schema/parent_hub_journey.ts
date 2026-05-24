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

/** Parent Hub 3-day guided journey — free period before paywall. */
export const parentHubJourneyTable = pgTable(
  "parent_hub_journey",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    /** Last child used for Today's Path. */
    childId: integer("child_id"),
    /** Completed journey day numbers, e.g. [1, 2, 3]. */
    completedDays: jsonb("completed_days").$type<number[]>().notNull().default([]),
    /** Next day to complete (1–3 while free; 4 when free quota exhausted). */
    currentDay: integer("current_day").notNull().default(1),
    /** Journey day numbers when peek-ahead was consumed. */
    peekAheadUsed: jsonb("peek_ahead_used").$type<number[]>().notNull().default([]),
    /** Bonus tile ids earned during free journey. */
    bonusUnlocks: jsonb("bonus_unlocks").$type<string[]>().notNull().default([]),
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
    userUq: uniqueIndex("parent_hub_journey_user_uq").on(t.userId),
    userIdx: index("parent_hub_journey_user_idx").on(t.userId),
  }),
);

export type ParentHubJourney = typeof parentHubJourneyTable.$inferSelect;
export type InsertParentHubJourney = typeof parentHubJourneyTable.$inferInsert;
