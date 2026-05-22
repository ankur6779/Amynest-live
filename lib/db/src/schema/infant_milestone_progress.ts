import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Per-child Infant Buddy milestone progress — synced across devices. */
export const infantMilestoneProgressTable = pgTable(
  "infant_milestone_progress",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id").notNull(),
    milestoneId: text("milestone_id").notNull(),
    /** "not_started" | "in_progress" | "achieved" */
    state: text("state").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childMilestoneUnique: uniqueIndex(
      "infant_milestone_progress_child_milestone_uniq",
    ).on(t.childId, t.milestoneId),
    childIdx: index("infant_milestone_progress_child_idx").on(t.childId),
    userIdx: index("infant_milestone_progress_user_idx").on(t.userId),
  }),
);

export const insertInfantMilestoneProgressSchema = createInsertSchema(
  infantMilestoneProgressTable,
).omit({ id: true, createdAt: true });

export type InfantMilestoneProgressRow =
  typeof infantMilestoneProgressTable.$inferSelect;
export type InsertInfantMilestoneProgress = z.infer<
  typeof insertInfantMilestoneProgressSchema
>;
