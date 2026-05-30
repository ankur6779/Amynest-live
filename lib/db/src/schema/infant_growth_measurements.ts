import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const infantGrowthMeasurementsTable = pgTable(
  "infant_growth_measurements",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    weightKg: real("weight_kg"),
    heightCm: real("height_cm"),
    headCm: real("head_cm"),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childIdx: index("infant_growth_measurements_child_idx").on(t.childId),
    childMeasuredIdx: index("infant_growth_measurements_child_measured_idx").on(
      t.childId,
      t.measuredAt,
    ),
  }),
);

export const insertInfantGrowthMeasurementSchema = createInsertSchema(
  infantGrowthMeasurementsTable,
).omit({ id: true, createdAt: true });

export type InfantGrowthMeasurementRow =
  typeof infantGrowthMeasurementsTable.$inferSelect;
