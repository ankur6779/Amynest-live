import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  doublePrecision,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Short-term NBA decision logs for ML training (content-orchestration V3). */
export const nbaDecisionLogsTable = pgTable(
  "nba_decision_logs",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    features: jsonb("features").notNull(),
    normalizedFeatures: jsonb("normalized_features").notNull(),
    actionTaken: text("action_taken").notNull(),
    mappedAction: text("mapped_action").notNull(),
    source: text("source").notNull(),
    confidence: doublePrecision("confidence").notNull(),
    rewardEstimate: doublePrecision("reward_estimate"),
    outcome: jsonb("outcome"),
    reward: doublePrecision("reward"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childIdx: index("nba_decision_logs_child_idx").on(t.childId),
    tsIdx: index("nba_decision_logs_timestamp_idx").on(t.timestamp),
  }),
);

export const insertNbaDecisionLogSchema = createInsertSchema(nbaDecisionLogsTable).omit({
  id: true,
  createdAt: true,
});

export type NbaDecisionLogRow = typeof nbaDecisionLogsTable.$inferSelect;
export type InsertNbaDecisionLog = z.infer<typeof insertNbaDecisionLogSchema>;
