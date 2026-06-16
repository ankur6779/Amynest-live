import { pgTable, text, integer, serial, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const behaviorsTable = pgTable(
  "behaviors",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    date: text("date").notNull(),
    behavior: text("behavior").notNull(),
    type: text("type").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childDateIdx: index("behaviors_child_date_idx").on(t.childId, t.date),
  }),
);

export const insertBehaviorSchema = createInsertSchema(behaviorsTable).omit({ id: true, createdAt: true });
export type InsertBehavior = z.infer<typeof insertBehaviorSchema>;
export type Behavior = typeof behaviorsTable.$inferSelect;
