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

/**
 * Per-child vaccination log.
 *
 * One row per (child, vaccination-schedule entry). The schedule entry is
 * keyed by `ageLabel` (e.g. "Birth", "6 weeks", "12 months") which mirrors
 * the `VaxEntry.ageLabel` strings shipped from `@workspace/infant-hub`.
 *
 * Status:
 *   - "done"   = parent confirmed the dose was administered
 *   - "missed" = parent confirmed they missed/skipped the dose
 *
 * Absence of a row means the dose has not been actioned yet — the UI
 * derives "pending" from (schedule entry whose ageMonths <= child age) AND
 * (no row, or status missed).
 *
 * Using `ageLabel` as the natural key keeps the table tiny and avoids a
 * foreign key into a constants table — the canonical schedule still lives
 * in code (`VACCINATIONS` in `lib/infant-hub`).
 */
export const vaccinationLogsTable = pgTable(
  "vaccination_logs",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    childId: integer("child_id").notNull(),
    /** Matches `VaxEntry.ageLabel` (e.g. "Birth", "6 weeks"). */
    ageLabel: text("age_label").notNull(),
    /** "done" | "missed". */
    status: text("status").notNull(),
    /** When the dose was actually given (parent-supplied; optional). */
    doneAt: timestamp("done_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    childAgeUnique: uniqueIndex("vaccination_logs_child_age_uniq").on(
      t.childId,
      t.ageLabel,
    ),
    childIdx: index("vaccination_logs_child_idx").on(t.childId),
    userIdx: index("vaccination_logs_user_idx").on(t.userId),
  }),
);

export const insertVaccinationLogSchema = createInsertSchema(
  vaccinationLogsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type VaccinationLogRow = typeof vaccinationLogsTable.$inferSelect;
export type InsertVaccinationLog = z.infer<typeof insertVaccinationLogSchema>;
