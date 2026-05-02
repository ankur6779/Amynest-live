import { pgTable, text, integer, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const routinesTable = pgTable("routines", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull(),
  date: text("date").notNull(),
  title: text("title").notNull(),
  items: jsonb("items").notNull().default([]),
  // Per-routine UI preferences shared across web + mobile (e.g. ageBandFilter).
  // Defaults to an empty object so older routines deserialize cleanly.
  uiPrefs: jsonb("ui_prefs").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoutineSchema = createInsertSchema(routinesTable).omit({ id: true, createdAt: true });
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type Routine = typeof routinesTable.$inferSelect;
