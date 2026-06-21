import { index, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const billingAuditEventsTable = pgTable(
  "billing_audit_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id"),
    provider: text("provider").notNull().default("revenuecat"),
    source: text("source").notNull(),
    eventName: text("event_name").notNull(),
    status: text("status").notNull().default("ok"),
    providerEventId: text("provider_event_id"),
    fromState: text("from_state"),
    toState: text("to_state"),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("billing_audit_events_user_created_idx").on(t.userId, t.createdAt),
    eventCreatedIdx: index("billing_audit_events_event_created_idx").on(t.eventName, t.createdAt),
    providerEventIdx: index("billing_audit_events_provider_event_idx").on(t.provider, t.providerEventId),
  }),
);

export type BillingAuditEvent = typeof billingAuditEventsTable.$inferSelect;
