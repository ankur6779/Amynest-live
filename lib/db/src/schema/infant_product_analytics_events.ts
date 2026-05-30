import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Durable infant product analytics — ingested from client `infant_parenting` logs. */
export const infantProductAnalyticsEventsTable = pgTable(
  "infant_product_analytics_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    event: text("event").notNull(),
    childAgeMonths: integer("child_age_months"),
    infantAgeBand: text("infant_age_band"),
    properties: jsonb("properties")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    eventCreatedIdx: index("infant_pa_events_event_created_idx").on(
      t.event,
      t.createdAt,
    ),
    userCreatedIdx: index("infant_pa_events_user_created_idx").on(
      t.userId,
      t.createdAt,
    ),
    childCreatedIdx: index("infant_pa_events_child_created_idx").on(
      t.childId,
      t.createdAt,
    ),
  }),
);

export const insertInfantProductAnalyticsEventSchema = createInsertSchema(
  infantProductAnalyticsEventsTable,
).omit({ id: true, createdAt: true });

export type InfantProductAnalyticsEventRow =
  typeof infantProductAnalyticsEventsTable.$inferSelect;
export type InsertInfantProductAnalyticsEvent = z.infer<
  typeof insertInfantProductAnalyticsEventSchema
>;
