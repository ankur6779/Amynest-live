import {
  pgTable,
  serial,
  integer,
  varchar,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * Life Skills progress — one row per (child, skillId). Tracks the dates a
 * skill was practised so the streak fire and weekly progress bar can both
 * be derived without a second table.
 *
 * `completedDates` is a jsonb array of YYYY-MM-DD strings (UTC). We don't
 * use a child table because lookups are always "all rows for this child",
 * and the per-skill date list stays small enough (≤ a few hundred entries
 * over a multi-year child timeline) that jsonb is the right call.
 *
 * `currentStreak` and `bestStreak` are denormalised counts maintained on
 * write so the dashboard never has to scan jsonb to render the streak fire.
 */
export const lifeSkillsProgressTable = pgTable(
  "life_skills_progress",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 64 }).notNull(),
    childId: integer("child_id").notNull(),
    /** Stable string id from the seed JSON (e.g. "self_dressing"). */
    skillId: varchar("skill_id", { length: 80 }).notNull(),
    /** YYYY-MM-DD strings, UTC. */
    completedDates: jsonb("completed_dates").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    currentStreak: integer("current_streak").notNull().default(0),
    bestStreak: integer("best_streak").notNull().default(0),
    lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    childSkillIdx: uniqueIndex("life_skills_progress_child_skill_idx").on(
      table.childId,
      table.skillId,
    ),
    userIdx: index("life_skills_progress_user_idx").on(table.userId),
  }),
);

export type LifeSkillsProgressRow = typeof lifeSkillsProgressTable.$inferSelect;
export type InsertLifeSkillsProgress = typeof lifeSkillsProgressTable.$inferInsert;
