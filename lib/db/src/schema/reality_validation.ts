import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
  index,
  real,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Full recommendation → action → outcome → impact chain. */
export const interventionLedgerTable = pgTable(
  "intervention_ledger",
  {
    id: serial("id").primaryKey(),
    ledgerId: text("ledger_id").notNull().unique(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    interventionId: text("intervention_id").notNull(),
    interventionType: text("intervention_type").notNull(),
    surface: text("surface").notNull(),
    recommendationTitle: text("recommendation_title").notNull(),
    recommendationKey: text("recommendation_key").notNull(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }).notNull(),
    actionAt: timestamp("action_at", { withTimezone: true }),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    scorecard: text("scorecard").notNull().default("pending_validation"),
    confidenceScore: real("confidence_score").notNull().default(0),
    baselineMetrics: jsonb("baseline_metrics").notNull().default({}),
    followUpMetrics: jsonb("follow_up_metrics"),
    metricDeltas: jsonb("metric_deltas"),
    experimentId: text("experiment_id"),
    experimentVariant: text("experiment_variant"),
    halfLifeDays: integer("half_life_days"),
    evidenceSummary: text("evidence_summary").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("intervention_ledger_user_idx").on(t.userId, t.dispatchedAt),
    userKeyIdx: index("intervention_ledger_user_key_idx").on(t.userId, t.recommendationKey),
    pendingIdx: index("intervention_ledger_pending_idx").on(t.userId, t.scorecard),
  }),
);

/** Aggregated family strategy profile from validated outcomes. */
export const familyStrategyProfileTable = pgTable("family_strategy_profile", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  profile: jsonb("profile").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InterventionLedgerRow = typeof interventionLedgerTable.$inferSelect;
export type FamilyStrategyProfileRow = typeof familyStrategyProfileTable.$inferSelect;
