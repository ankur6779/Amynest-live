import {
  pgTable,
  serial,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const systemMetaStateTable = pgTable(
  "system_meta_state",
  {
    id: serial("id").primaryKey(),
    metrics: jsonb("metrics").notNull(),
    activeModels: jsonb("active_models").notNull().default([]),
    experiments: jsonb("experiments").notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    updatedIdx: index("system_meta_state_updated_idx").on(t.updatedAt),
  }),
);

export const insertSystemMetaStateSchema = createInsertSchema(
  systemMetaStateTable,
).omit({ id: true, updatedAt: true });

export type SystemMetaStateRow = typeof systemMetaStateTable.$inferSelect;
