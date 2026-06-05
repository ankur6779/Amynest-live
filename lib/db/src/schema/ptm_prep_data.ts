import {
  pgTable,
  text,
  timestamp,
  jsonb,
  bigint,
  index,
} from "drizzle-orm/pg-core";

/** Loose JSON shapes — validated at the API boundary via zod. */
export type PtmPrepDraftJson = Record<string, unknown> | null;
export type PtmPrepHistoryJson = Record<string, unknown>[];
export type PtmPrepRemindersJson = Record<string, unknown>[];

/** Per-user PTM Prep state — draft, history, and reminders synced across devices. */
export const ptmPrepDataTable = pgTable(
  "ptm_prep_data",
  {
    userId: text("user_id").primaryKey(),
    draft: jsonb("draft").$type<PtmPrepDraftJson>(),
    history: jsonb("history").$type<PtmPrepHistoryJson>().notNull().default([]),
    reminders: jsonb("reminders").$type<PtmPrepRemindersJson>().notNull().default([]),
    clientUpdatedAt: bigint("client_updated_at", { mode: "number" }).notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    updatedIdx: index("ptm_prep_data_updated_idx").on(t.updatedAt),
  }),
);

export type PtmPrepDataRow = typeof ptmPrepDataTable.$inferSelect;
export type InsertPtmPrepData = typeof ptmPrepDataTable.$inferInsert;
