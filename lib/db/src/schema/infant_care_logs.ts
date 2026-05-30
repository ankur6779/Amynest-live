import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Quick infant care events — feeding, diaper, burp. */
export const INFANT_CARE_LOG_TYPES = [
  "feed_breast",
  "feed_bottle",
  "feed_solid",
  "diaper_wet",
  "diaper_dirty",
  "diaper_mixed",
  "burp",
] as const;

export type InfantCareLogType = (typeof INFANT_CARE_LOG_TYPES)[number];

export const infantCareLogsTable = pgTable(
  "infant_care_logs",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    /** Parent who logged the event (actor). */
    userId: text("user_id").notNull(),
    logType: text("log_type").notNull(),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childIdx: index("infant_care_logs_child_idx").on(t.childId),
    childLoggedIdx: index("infant_care_logs_child_logged_idx").on(
      t.childId,
      t.loggedAt,
    ),
  }),
);

export const insertInfantCareLogSchema = createInsertSchema(
  infantCareLogsTable,
).omit({ id: true, createdAt: true });

export type InfantCareLogRow = typeof infantCareLogsTable.$inferSelect;
export type InsertInfantCareLog = z.infer<typeof insertInfantCareLogSchema>;
