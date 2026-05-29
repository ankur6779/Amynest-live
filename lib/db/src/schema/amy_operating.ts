import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/** Amy decision memory — recommendations, responses, outcomes. */
export const amyDecisionLogTable = pgTable(
  "amy_decision_log",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    recommendationId: text("recommendation_id").notNull(),
    recommendationTitle: text("recommendation_title").notNull(),
    recommendationType: text("recommendation_type"),
    userResponse: text("user_response").notNull().default("ignored"),
    outcomeAchieved: boolean("outcome_achieved"),
    contextJson: jsonb("context_json").default({}),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("amy_decision_log_user_idx").on(t.userId, t.recordedAt),
  }),
);

/** Cached daily Amy briefings. */
export const amyDailyBriefingsTable = pgTable(
  "amy_daily_briefings",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    localDate: text("local_date").notNull(),
    briefingJson: jsonb("briefing_json").notNull(),
    engineVersion: text("engine_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userDateIdx: index("amy_daily_briefings_user_date_idx").on(t.userId, t.localDate),
  }),
);

/** Longitudinal family timeline events. */
export const amyTimelineEventsTable = pgTable(
  "amy_timeline_events",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    eventType: text("event_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("amy_timeline_events_user_idx").on(t.userId, t.occurredAt),
  }),
);

/** Family knowledge graph snapshot (nodes + edges). */
export const amyKnowledgeGraphTable = pgTable("amy_knowledge_graph", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  graphJson: jsonb("graph_json").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AmyDecisionLogRow = typeof amyDecisionLogTable.$inferSelect;
export type AmyDailyBriefingRow = typeof amyDailyBriefingsTable.$inferSelect;
export type AmyTimelineEventRow = typeof amyTimelineEventsTable.$inferSelect;
