import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Tracks CRM journey enrollment and step progress per user or anonymous device.
 */
export const notificationJourneyEnrollmentsTable = pgTable(
  "notification_journey_enrollments",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    deviceId: text("device_id"),
    segment: text("segment").notNull(),
    journeyId: text("journey_id").notNull(),
    currentStepId: text("current_step_id"),
    currentStepIndex: integer("current_step_index").notNull().default(0),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    lastStepSentAt: timestamp("last_step_sent_at", { withTimezone: true }),
    nextEligibleAt: timestamp("next_eligible_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Comma-separated step IDs already sent. */
    completedStepIds: text("completed_step_ids"),
  },
  (t) => ({
    userSegmentUnique: uniqueIndex("notification_journey_user_segment_unique")
      .on(t.userId, t.segment)
      .where(sql`${t.userId} IS NOT NULL`),
    deviceSegmentUnique: uniqueIndex("notification_journey_device_segment_unique")
      .on(t.deviceId, t.segment)
      .where(sql`${t.deviceId} IS NOT NULL`),
    nextEligibleIdx: index("notification_journey_next_eligible_idx").on(t.nextEligibleAt),
  }),
);

export type NotificationJourneyEnrollment =
  typeof notificationJourneyEnrollmentsTable.$inferSelect;
export type InsertNotificationJourneyEnrollment =
  typeof notificationJourneyEnrollmentsTable.$inferInsert;
