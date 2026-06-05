import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  integer,
} from "drizzle-orm/pg-core";

/** Multi-day routine activity fingerprints per child (personalization memory). */
export const routinePersonalizationSnapshotsTable = pgTable(
  "routine_personalization_snapshots",
  {
    id: serial("id").primaryKey(),
    childId: text("child_id").notNull(),
    routineDate: text("routine_date").notNull(),
    activityKeys: jsonb("activity_keys").notNull().$type<string[]>(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childDateUq: uniqueIndex("routine_pers_snap_child_date_uq").on(
      t.childId,
      t.routineDate,
    ),
    childRecordedIdx: index("routine_pers_snap_child_recorded_idx").on(
      t.childId,
      t.recordedAt,
    ),
  }),
);

/** Activity completion / skip outcomes for routine adaptation. */
export const routineActivityOutcomesTable = pgTable(
  "routine_activity_outcomes",
  {
    id: text("id").primaryKey(),
    childId: text("child_id"),
    routineDate: text("routine_date"),
    activity: text("activity").notNull(),
    category: text("category").notNull().default("unknown"),
    completed: integer("completed").notNull().default(0),
    skipped: integer("skipped").notNull().default(0),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childRecordedIdx: index("routine_outcome_child_recorded_idx").on(
      t.childId,
      t.recordedAt,
    ),
  }),
);

export type RoutinePersonalizationSnapshotRow =
  typeof routinePersonalizationSnapshotsTable.$inferSelect;
export type RoutineActivityOutcomeRow = typeof routineActivityOutcomesTable.$inferSelect;
