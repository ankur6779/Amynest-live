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
 * Persistent adaptive learning profile per child for @workspace/content-orchestration V2.
 * JSON shape matches LearningProfile in content-orchestration types-v2.
 */
export const childContentLearningProfilesTable = pgTable(
  "child_content_learning_profiles",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    version: integer("version").notNull().default(1),
    profile: jsonb("profile").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("child_content_learning_profiles_child_uq").on(t.childId),
    userIdx: index("child_content_learning_profiles_user_idx").on(t.userId),
  }),
);

export const insertChildContentLearningProfileSchema = createInsertSchema(
  childContentLearningProfilesTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type ChildContentLearningProfileRow =
  typeof childContentLearningProfilesTable.$inferSelect;
export type InsertChildContentLearningProfile = z.infer<
  typeof insertChildContentLearningProfileSchema
>;
