import {
  pgTable,
  serial,
  integer,
  real,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const childPredictionSnapshotsTable = pgTable(
  "child_prediction_snapshots",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    predictedSkills: jsonb("predicted_skills").notNull(),
    dropOffRisk: real("drop_off_risk").notNull(),
    engagementScore: real("engagement_score").notNull(),
    confidence: real("confidence").notNull().default(0.5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childCreatedIdx: index("child_prediction_snapshots_child_created_idx").on(
      t.childId,
      t.createdAt,
    ),
  }),
);

export const insertChildPredictionSnapshotSchema = createInsertSchema(
  childPredictionSnapshotsTable,
).omit({ id: true, createdAt: true });

export type ChildPredictionSnapshotRow =
  typeof childPredictionSnapshotsTable.$inferSelect;
