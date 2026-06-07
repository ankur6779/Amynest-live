import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Idempotent RevenueCat webhook processing — keyed by event id or transaction id.
 */
export const revenuecatWebhookEventsTable = pgTable("revenuecat_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type"),
  appUserId: text("app_user_id"),
  payload: jsonb("payload"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RevenuecatWebhookEvent = typeof revenuecatWebhookEventsTable.$inferSelect;
