import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Idempotent RevenueCat webhook processing — keyed by event id or transaction id.
 */
export const revenuecatWebhookEventsTable = pgTable(
  "revenuecat_webhook_events",
  {
    eventId: text("event_id").primaryKey(),
    eventType: text("event_type"),
    appUserId: text("app_user_id"),
    payload: jsonb("payload"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingStatus: text("processing_status").notNull().default("pending"),
    processingError: text("processing_error"),
    eventTimestamp: timestamp("event_timestamp", { withTimezone: true }),
    transactionId: text("transaction_id"),
    originalTransactionId: text("original_transaction_id"),
    environment: text("environment"),
  },
  (t) => ({
    appUserReceivedIdx: index("revenuecat_webhook_events_app_user_received_idx").on(
      t.appUserId,
      t.receivedAt,
    ),
    processingStatusIdx: index("revenuecat_webhook_events_processing_status_idx").on(
      t.processingStatus,
      t.receivedAt,
    ),
    transactionIdx: index("revenuecat_webhook_events_transaction_idx").on(
      t.transactionId,
    ),
  }),
);

export type RevenuecatWebhookEvent = typeof revenuecatWebhookEventsTable.$inferSelect;
