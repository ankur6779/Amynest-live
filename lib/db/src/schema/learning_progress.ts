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

/**
 * Unified child learning profile — powers LearningProgressEngine.
 * One row per child. Aggregates mastery, XP, streaks, section levels.
 */
export const learningProgressTable = pgTable(
  "learning_progress",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    journeyDay: integer("journey_day").notNull().default(1),
    learningLevel: integer("learning_level").notNull().default(1),
    masteryScore: integer("mastery_score").notNull().default(0),
    streakDays: integer("streak_days").notNull().default(0),
    totalXP: integer("total_xp").notNull().default(0),
    completedActivities: jsonb("completed_activities").notNull().default([]),
    unlockedSkills: jsonb("unlocked_skills").notNull().default([]),
    weakSkills: jsonb("weak_skills").notNull().default([]),
    preferredLearningModes: jsonb("preferred_learning_modes")
      .notNull()
      .default(["play", "visual"]),
    lastActiveDate: text("last_active_date"),
    currentPhase: text("current_phase").notNull().default("explore"),
    currentCurriculumStage: text("current_curriculum_stage")
      .notNull()
      .default("early"),
    dailyUnlockSeed: integer("daily_unlock_seed").notNull().default(0),
    nextRecommendedSkills: jsonb("next_recommended_skills").notNull().default([]),
    sectionProgress: jsonb("section_progress").notNull().default({}),
    coins: integer("coins").notNull().default(0),
    stars: integer("stars").notNull().default(0),
    badges: jsonb("badges").notNull().default([]),
    dailySession: jsonb("daily_session"),
    learningMemory: jsonb("learning_memory"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("learning_progress_child_uq").on(t.childId),
    userIdx: index("learning_progress_user_idx").on(t.userId),
    childIdx: index("learning_progress_child_idx").on(t.childId),
  }),
);

export const insertLearningProgressSchema = createInsertSchema(
  learningProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type LearningProgressRow = typeof learningProgressTable.$inferSelect;
export type InsertLearningProgress = z.infer<typeof insertLearningProgressSchema>;
