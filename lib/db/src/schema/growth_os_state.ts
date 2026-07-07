import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const growthOsStateTable = pgTable(
  "growth_os_state",
  {
    id: text("id").primaryKey().default("singleton"),
    payload: jsonb("payload").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    updatedIdx: index("growth_os_state_updated_idx").on(t.updatedAt),
  }),
);

export type GrowthOsStateRow = typeof growthOsStateTable.$inferSelect;
