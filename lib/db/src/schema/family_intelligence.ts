import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  jsonb,
  index,
  uniqueIndex,
  real,
} from "drizzle-orm/pg-core";

/** Daily family health score history for trend analysis. */
export const familyIntelligenceSnapshotsTable = pgTable(
  "family_intelligence_snapshots",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    primaryChildId: integer("primary_child_id"),
    localDate: text("local_date").notNull(),
    healthScore: integer("health_score").notNull(),
    healthComponents: jsonb("health_components").notNull().default({}),
    trend7d: real("trend_7d"),
    trend30d: real("trend_30d"),
    riskSnapshot: jsonb("risk_snapshot").notNull().default({}),
    successMetrics: jsonb("success_metrics").notNull().default({}),
    topActionCategory: text("top_action_category"),
    engineVersion: text("engine_version").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userDateUq: uniqueIndex("family_intelligence_snapshots_user_date_uq").on(
      t.userId,
      t.localDate,
    ),
    userIdx: index("family_intelligence_snapshots_user_idx").on(t.userId, t.localDate),
  }),
);

/** Continuously updated family digital twin profile. */
export const familyDigitalTwinTable = pgTable("family_digital_twin", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  primaryChildId: integer("primary_child_id"),
  profile: jsonb("profile").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Parent-set family goals (reading, routine, learning, screen-time). */
export const familyGoalsTable = pgTable(
  "family_goals",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    goalType: text("goal_type").notNull(),
    target: text("target").notNull(),
    targetValue: integer("target_value").notNull().default(3),
    unit: text("unit").notNull().default("sessions"),
    progress: integer("progress").notNull().default(0),
    active: integer("active").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("family_goals_user_idx").on(t.userId),
  }),
);

/** Long-term family memory — what worked for this family. */
export const familyMemoryTable = pgTable(
  "family_memory",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    category: text("category").notNull(),
    memoryKey: text("memory_key").notNull(),
    outcome: text("outcome").notNull(),
    context: text("context"),
    confidenceScore: real("confidence_score"),
    sampleSize: integer("sample_size"),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("family_memory_user_idx").on(t.userId, t.recordedAt),
    userKeyIdx: index("family_memory_user_key_idx").on(t.userId, t.memoryKey),
  }),
);

/** Detected family moments for coordinated cross-product actions. */
export const familyMomentsTable = pgTable(
  "family_moments",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id"),
    momentType: text("moment_type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    coordinatedActions: jsonb("coordinated_actions").notNull().default([]),
    acknowledged: integer("acknowledged").notNull().default(0),
    detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("family_moments_user_idx").on(t.userId, t.detectedAt),
  }),
);

export type FamilyIntelligenceSnapshotRow =
  typeof familyIntelligenceSnapshotsTable.$inferSelect;
export type FamilyDigitalTwinRow = typeof familyDigitalTwinTable.$inferSelect;
export type FamilyGoalRow = typeof familyGoalsTable.$inferSelect;
export type FamilyMemoryRow = typeof familyMemoryTable.$inferSelect;
export type FamilyMomentRow = typeof familyMomentsTable.$inferSelect;
