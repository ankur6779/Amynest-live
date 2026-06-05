import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Unified, append-only product analytics spine. Every event is validated
 * against @workspace/analytics-taxonomy before it lands here. This is pure
 * measurement infrastructure — it lives above the frozen routine engine and
 * never influences routine generation.
 */
export const analyticsEventsTable = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    eventName: text("event_name").notNull(),
    eventCategory: text("event_category").notNull(),
    sessionId: text("session_id"),
    props: jsonb("props").$type<Record<string, unknown>>().notNull().default({}),
    platform: text("platform"),
    appVersion: text("app_version"),
    /** When the client emitted the event (best-effort, client clock). */
    clientTs: timestamp("client_ts", { withTimezone: true }),
    /** When the server accepted the event (authoritative ordering). */
    serverTs: timestamp("server_ts", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    eventCreatedIdx: index("analytics_events_event_created_idx").on(
      t.eventName,
      t.serverTs,
    ),
    userCreatedIdx: index("analytics_events_user_created_idx").on(
      t.userId,
      t.serverTs,
    ),
    categoryCreatedIdx: index("analytics_events_category_created_idx").on(
      t.eventCategory,
      t.serverTs,
    ),
  }),
);

export const insertAnalyticsEventSchema = createInsertSchema(
  analyticsEventsTable,
).omit({ id: true, serverTs: true });

export type AnalyticsEventRow = typeof analyticsEventsTable.$inferSelect;
export type InsertAnalyticsEvent = z.infer<typeof insertAnalyticsEventSchema>;
