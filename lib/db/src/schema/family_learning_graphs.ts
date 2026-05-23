import {
  pgTable,
  serial,
  text,
  integer,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const familyLearningGraphsTable = pgTable(
  "family_learning_graphs",
  {
    id: serial("id").primaryKey(),
    familyId: text("family_id").notNull(),
    graph: jsonb("graph").notNull(),
    insights: jsonb("insights").notNull(),
    version: integer("version").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    familyUq: uniqueIndex("family_learning_graphs_family_uq").on(t.familyId),
  }),
);

export const insertFamilyLearningGraphSchema = createInsertSchema(
  familyLearningGraphsTable,
).omit({ id: true, updatedAt: true });

export type FamilyLearningGraphRow = typeof familyLearningGraphsTable.$inferSelect;
