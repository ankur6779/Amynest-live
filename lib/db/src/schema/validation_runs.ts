import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const validationRunsTable = pgTable(
  "validation_runs",
  {
    id: serial("id").primaryKey(),
    tutorialId: text("tutorial_id").notNull(),
    testerType: text("tester_type").notNull(),
    completionTime: integer("completion_time").notNull(),
    success: boolean("success").notNull(),
    feedback: text("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tutorialIdx: index("validation_runs_tutorial_idx").on(t.tutorialId),
    testerIdx: index("validation_runs_tester_idx").on(t.testerType),
    createdIdx: index("validation_runs_created_idx").on(t.createdAt),
  }),
);

export const insertValidationRunSchema = createInsertSchema(validationRunsTable).omit({
  id: true,
  createdAt: true,
});

export type ValidationRun = typeof validationRunsTable.$inferSelect;
export type InsertValidationRun = z.infer<typeof insertValidationRunSchema>;
