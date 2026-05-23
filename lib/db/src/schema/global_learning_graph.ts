import {
  pgTable,
  serial,
  text,
  real,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const globalLearningGraphTable = pgTable(
  "global_learning_graph",
  {
    id: serial("id").primaryKey(),
    skill: text("skill").notNull(),
    successRate: real("success_rate").notNull().default(0.5),
    engagementScore: real("engagement_score").notNull().default(0.5),
    transitions: jsonb("transitions").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    skillUq: uniqueIndex("global_learning_graph_skill_uq").on(t.skill),
  }),
);

export const insertGlobalLearningGraphSchema = createInsertSchema(
  globalLearningGraphTable,
).omit({ id: true, updatedAt: true });

export type GlobalLearningGraphDbRow =
  typeof globalLearningGraphTable.$inferSelect;
