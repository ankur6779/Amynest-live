import { pgTable, text, serial, timestamp, boolean, integer, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export type FeatureScheduleType = "event_prep" | "sleep_winddown";

export type FeatureScheduleConfig = {
  /** ISO timestamp — fire when local minute matches (one-shot). */
  remindAt?: string;
  /** Event display name for push copy. */
  eventName?: string;
  /** YYYY-MM-DD event date for fingerprinting. */
  eventDate?: string;
  title?: string;
  body?: string;
  deepLink?: string;
};

/**
 * User-initiated feature reminder preferences synced from the client.
 * Server cron evaluates schedules and dispatches through notification_log.
 */
export const featureNotificationSchedulesTable = pgTable(
  "feature_notification_schedules",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    scheduleType: text("schedule_type").notNull().$type<FeatureScheduleType>(),
    entityId: text("entity_id").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    config: jsonb("config").$type<FeatureScheduleConfig>().notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userTypeEntityUniq: uniqueIndex("feature_notif_sched_user_type_entity").on(
      t.userId,
      t.scheduleType,
      t.entityId,
    ),
  }),
);

export type FeatureNotificationScheduleRow =
  typeof featureNotificationSchedulesTable.$inferSelect;
