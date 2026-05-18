import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Persistent log of Razorpay webhook event ids we have already processed.
 * Used to make webhook handling idempotent across server restarts and
 * across multiple server instances. The event id is the primary key, so
 * concurrent inserts of the same id are rejected by the database via
 * ON CONFLICT DO NOTHING — exactly one webhook delivery wins the race
 * and proceeds to process the event.
 */
export const razorpayWebhookEventsTable = pgTable("razorpay_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type"),
  payload: jsonb("payload"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RazorpayWebhookEvent = typeof razorpayWebhookEventsTable.$inferSelect;
