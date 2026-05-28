import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const skillGraphProgressTable = pgTable(
  "skill_graph_progress",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    skillId: text("skill_id").notNull(),
    category: text("category").notNull(),
    mastery: integer("mastery").notNull().default(0),
    confidence: integer("confidence").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
    lastPracticedAt: text("last_practiced_at"),
    relatedSkills: jsonb("related_skills").notNull().default([]),
    weakAreas: jsonb("weak_areas").notNull().default([]),
    progressionStage: text("progression_stage").notNull().default("not_started"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childSkillUq: uniqueIndex("skill_graph_progress_child_skill_uq").on(
      t.childId,
      t.skillId,
    ),
    childIdx: index("skill_graph_progress_child_idx").on(t.childId),
  }),
);

export const insertSkillGraphProgressSchema = createInsertSchema(
  skillGraphProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type SkillGraphProgressRow = typeof skillGraphProgressTable.$inferSelect;
