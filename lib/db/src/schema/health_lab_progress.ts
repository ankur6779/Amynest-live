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

/** Per-child Amy Health Lab™ profile — one row, jsonb blob for offline-first sync. */
export const healthLabProgressTable = pgTable(
  "health_lab_progress",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    /** Full client profile snapshot (version 2 schema). */
    profile: jsonb("profile").notNull().default({}),
    /** Client wall-clock ms when profile was last written — conflict resolution. */
    clientUpdatedAt: timestamp("client_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("health_lab_progress_child_uq").on(t.childId),
    userIdx: index("health_lab_progress_user_idx").on(t.userId),
  }),
);

export const insertHealthLabProgressSchema = createInsertSchema(
  healthLabProgressTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type HealthLabProgressRow = typeof healthLabProgressTable.$inferSelect;
export type InsertHealthLabProgress = z.infer<typeof insertHealthLabProgressSchema>;
