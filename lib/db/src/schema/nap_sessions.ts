import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Infant Sleep Prediction — one row per nap or night-sleep session logged
 * by the parent. Used both as a history feed and as the input signal for
 * dynamic wake-window adjustments (short nap → shorter next window, etc.).
 *
 * `kind`:
 *   - "nap"   → daytime nap
 *   - "night" → main night-sleep
 *
 * `endedAt` is nullable while a session is in progress (parent tapped
 * "start sleep" but hasn't tapped "wake up" yet). `durationMs` mirrors the
 * computed length so we can sort/aggregate without recomputing.
 */
export const napSessionsTable = pgTable(
  "nap_sessions",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    kind: text("kind").notNull().default("nap"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /** Snapshot of `endedAt - startedAt` in ms (0 while in-progress). */
    durationMs: integer("duration_ms").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childIdx: index("nap_sessions_child_idx").on(t.childId),
    userIdx: index("nap_sessions_user_idx").on(t.userId),
    childStartedIdx: index("nap_sessions_child_started_idx").on(
      t.childId,
      t.startedAt,
    ),
  }),
);

export const insertNapSessionSchema = createInsertSchema(napSessionsTable).omit(
  {
    id: true,
    createdAt: true,
  },
);

export type NapSessionRow = typeof napSessionsTable.$inferSelect;
export type InsertNapSession = z.infer<typeof insertNapSessionSchema>;
