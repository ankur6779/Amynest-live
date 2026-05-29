import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Causal attribution: links a notification to a downstream business outcome.
 * Powers outcome analytics and A/B experiment uplift measurement.
 */
export const notificationOutcomeEventsTable = pgTable(
  "notification_outcome_events",
  {
    id: serial("id").primaryKey(),
    notificationLogId: integer("notification_log_id").notNull(),
    userId: text("user_id").notNull(),
    /** routine_completed | lesson_completed | subscription_started | session_returned | … */
    outcomeEvent: text("outcome_event").notNull(),
    outcomeAt: timestamp("outcome_at", { withTimezone: true }).notNull(),
    /** True when outcome occurred within attribution window after open/send. */
    attributed: boolean("attributed").notNull().default(false),
    attributionWindowHours: integer("attribution_window_hours").notNull().default(48),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    logIdx: index("notification_outcome_events_log_idx").on(t.notificationLogId),
    userIdx: index("notification_outcome_events_user_idx").on(t.userId, t.outcomeAt),
    userEventIdx: index("notification_outcome_events_user_event_idx").on(
      t.userId,
      t.outcomeEvent,
    ),
  }),
);

export type NotificationOutcomeEvent = typeof notificationOutcomeEventsTable.$inferSelect;
export type InsertNotificationOutcomeEvent =
  typeof notificationOutcomeEventsTable.$inferInsert;

/**
 * Multi-day notification campaign progression (3/7/14/30-day challenges).
 */
export const notificationCampaignProgressTable = pgTable(
  "notification_campaign_progress",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    campaignId: text("campaign_id").notNull(),
    currentStep: integer("current_step").notNull().default(1),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    stepCompletedAt: jsonb("step_completed_at")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCampaignUq: uniqueIndex("notification_campaign_progress_user_campaign_uq").on(
      t.userId,
      t.campaignId,
    ),
    userIdx: index("notification_campaign_progress_user_idx").on(t.userId),
  }),
);

export type NotificationCampaignProgress =
  typeof notificationCampaignProgressTable.$inferSelect;
export type InsertNotificationCampaignProgress =
  typeof notificationCampaignProgressTable.$inferInsert;
