import { pgTable, text, integer, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
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
  // True when a user has manually edited any item in this routine.
  // AI generation respects overrides by not repeating customized activities.
  customized: boolean("customized").notNull().default(false),
  // Adaptive Family Intelligence — human-readable strings explaining why this
  // routine differs from a default one. Surfaced in the "Why this routine?"
  // card on web + mobile. Examples:
  //   "Reduced morning load — sleep was shorter yesterday"
  //   "Placed learning at 09:00 (peak focus window)"
  adaptations: jsonb("adaptations").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoutineSchema = createInsertSchema(routinesTable).omit({ id: true, createdAt: true });
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type Routine = typeof routinesTable.$inferSelect;
