import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customRecipesTable = pgTable("custom_recipes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  prepTime: text("prep_time").notNull().default("10 min"),
  cookTime: text("cook_time").notNull().default("15 min"),
  servings: text("servings").notNull().default("1 child"),
  ingredients: jsonb("ingredients").notNull().default([]).$type<string[]>(),
  steps: jsonb("steps").notNull().default([]).$type<string[]>(),
  tip: text("tip"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomRecipeSchema = createInsertSchema(customRecipesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertCustomRecipe = z.infer<typeof insertCustomRecipeSchema>;
export type CustomRecipe = typeof customRecipesTable.$inferSelect;
