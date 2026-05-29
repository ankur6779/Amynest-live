import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Cross-device parent intent — what they were trying to accomplish. */
export const userIntentsTable = pgTable(
  "user_intents",
  {
    id: serial("id").primaryKey(),
    intentId: text("intent_id").notNull(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    intentType: text("intent_type").notNull(),
    intentSource: text("intent_source").notNull(),
    intentPriority: integer("intent_priority").notNull().default(50),
    state: text("state").notNull().default("pending"),
    title: text("title").notNull(),
    subtitle: text("subtitle").notNull().default(""),
    amyContinuationLine: text("amy_continuation_line").notNull().default(""),
    actionTarget: text("action_target").notNull(),
    entityId: text("entity_id"),
    href: text("href").notNull(),
    progressPct: integer("progress_pct").notNull().default(0),
    progressJson: jsonb("progress_json").notNull().default({}),
    deviceId: text("device_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    interruptedAt: timestamp("interrupted_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => ({
    intentIdUq: uniqueIndex("user_intents_intent_id_uq").on(t.intentId),
    userStateIdx: index("user_intents_user_state_idx").on(t.userId, t.state),
    userEntityIdx: index("user_intents_user_entity_idx").on(t.userId, t.entityId, t.intentType),
  }),
);

/** Intent funnel analytics — created → started → completed. */
export const userIntentEventsTable = pgTable(
  "user_intent_events",
  {
    id: serial("id").primaryKey(),
    intentId: text("intent_id").notNull(),
    userId: text("user_id").notNull(),
    event: text("event").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    intentIdx: index("user_intent_events_intent_idx").on(t.intentId),
    userEventIdx: index("user_intent_events_user_event_idx").on(t.userId, t.event),
  }),
);

export type UserIntentRow = typeof userIntentsTable.$inferSelect;
export type InsertUserIntentRow = typeof userIntentsTable.$inferInsert;
export type UserIntentEventRow = typeof userIntentEventsTable.$inferSelect;
