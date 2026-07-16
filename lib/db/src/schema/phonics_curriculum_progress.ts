import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Per-child phonics curriculum state (levels 1–6, mastery, weak phonemes).
 * Powers daily plan generation and auto level-up.
 */
export const phonicsCurriculumProgressTable = pgTable(
  "phonics_curriculum_progress",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    currentLevel: integer("current_level").notNull().default(1),
    masteryScore: integer("mastery_score").notNull().default(0),
    weakPhonemes: jsonb("weak_phonemes").$type<string[]>().notNull().default([]),
    streak: integer("streak").notNull().default(0),
    lastPlayedAt: timestamp("last_played_at", { withTimezone: true }),
    lastTestScore: integer("last_test_score"),
    lastTestAt: timestamp("last_test_at", { withTimezone: true }),
    /**
     * Activity ids completed today (reset when date changes).
     * Also stores letterGroupIndex (SATPIN progression) without a schema migration.
     */
    completedToday: jsonb("completed_today")
      .$type<{ date: string; ids: string[]; letterGroupIndex?: number }>()
      .notNull()
      .default({ date: "", ids: [] }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("phonics_curriculum_progress_child_uq").on(t.childId),
    userIdx: index("phonics_curriculum_progress_user_idx").on(t.userId),
  }),
);

export const insertPhonicsCurriculumProgressSchema = createInsertSchema(
  phonicsCurriculumProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type PhonicsCurriculumProgressRow =
  typeof phonicsCurriculumProgressTable.$inferSelect;
export type InsertPhonicsCurriculumProgress = z.infer<
  typeof insertPhonicsCurriculumProgressSchema
>;
