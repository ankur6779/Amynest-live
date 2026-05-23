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

export const childPersonalityProfilesTable = pgTable(
  "child_personality_profiles",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    version: integer("version").notNull().default(1),
    traits: jsonb("traits").notNull(),
    learningStyle: jsonb("learning_style").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("child_personality_profiles_child_uq").on(t.childId),
    userIdx: index("child_personality_profiles_user_idx").on(t.userId),
  }),
);

export const insertChildPersonalityProfileSchema = createInsertSchema(
  childPersonalityProfilesTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type ChildPersonalityProfileRow =
  typeof childPersonalityProfilesTable.$inferSelect;
