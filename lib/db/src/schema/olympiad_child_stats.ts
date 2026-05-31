import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Synced olympiad progress blob per child (mirrors client localStorage stats).
 * Server is source of truth on merge — client sends updatedAt for conflict resolution.
 */
export const olympiadChildStatsTable = pgTable(
  "olympiad_child_stats",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    statsJson: jsonb("stats_json").notNull().default({}),
    clientUpdatedAt: text("client_updated_at"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("olympiad_child_stats_child_uq").on(t.childId),
    userIdx: index("olympiad_child_stats_user_idx").on(t.userId),
  }),
);

export const insertOlympiadChildStatsSchema = createInsertSchema(
  olympiadChildStatsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type OlympiadChildStatsRow = typeof olympiadChildStatsTable.$inferSelect;
export type InsertOlympiadChildStats = z.infer<typeof insertOlympiadChildStatsSchema>;
