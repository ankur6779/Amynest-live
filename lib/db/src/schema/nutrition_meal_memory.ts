import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type MealOutcome = "loved" | "some" | "skipped";

export interface CaregiverShareChildSnapshot {
  childId: number;
  name: string;
  tonightMeal: string | null;
  dayLabel: string | null;
  mealPlanSlots: Array<{ slot: string; meal: string }>;
  familyPortionMeal: string | null;
}

export interface CaregiverSharePayload {
  foodStyle: string;
  children: CaregiverShareChildSnapshot[];
}

export interface MealMemoryEntry {
  dateKey: string;
  mealSlot: string;
  mealName: string;
  mealKey: string;
  outcome: MealOutcome;
  updatedAt: string;
}

/** Per-child meal acceptance memory — offline-first jsonb blob. */
export const nutritionMealMemoryTable = pgTable(
  "nutrition_meal_memory",
  {
    id: serial("id").primaryKey(),
    childId: integer("child_id").notNull(),
    userId: text("user_id").notNull(),
    entries: jsonb("entries").$type<MealMemoryEntry[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    childUq: uniqueIndex("nutrition_meal_memory_child_uq").on(t.childId),
    userIdx: index("nutrition_meal_memory_user_idx").on(t.userId),
  }),
);

export const nutritionCaregiverShareTable = pgTable(
  "nutrition_caregiver_share",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    shareToken: text("share_token").notNull(),
    childIds: jsonb("child_ids").$type<number[]>().notNull().default([]),
    payload: jsonb("payload").$type<CaregiverSharePayload>().notNull().default({ children: [], foodStyle: "indian" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tokenUq: uniqueIndex("nutrition_caregiver_share_token_uq").on(t.shareToken),
    userIdx: index("nutrition_caregiver_share_user_idx").on(t.userId),
  }),
);

export const insertNutritionMealMemorySchema = createInsertSchema(nutritionMealMemoryTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NutritionMealMemoryRow = typeof nutritionMealMemoryTable.$inferSelect;
export type NutritionCaregiverShareRow = typeof nutritionCaregiverShareTable.$inferSelect;
