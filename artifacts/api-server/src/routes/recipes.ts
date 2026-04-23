import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { db, customRecipesTable } from "@workspace/db";
import { z } from "zod/v4";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

const MAX_NAME_LEN = 100;
const MAX_FIELD_LEN = 60;
const MAX_INGREDIENTS = 20;
const MAX_STEPS = 15;
const MAX_TIP_LEN = 300;
const MAX_RECIPES_PER_USER = 50;

const RecipeBodySchema = z.object({
  name: z.string().min(1).max(MAX_NAME_LEN).trim(),
  prepTime: z.string().max(MAX_FIELD_LEN).trim().default("10 min"),
  cookTime: z.string().max(MAX_FIELD_LEN).trim().default("15 min"),
  servings: z.string().max(MAX_FIELD_LEN).trim().default("1 child"),
  ingredients: z.array(z.string().min(1).max(200).trim()).min(1).max(MAX_INGREDIENTS),
  steps: z.array(z.string().min(1).max(500).trim()).min(1).max(MAX_STEPS),
  tip: z.string().max(MAX_TIP_LEN).trim().optional(),
});

// GET /api/recipes — list all custom recipes for the authenticated user
router.get("/recipes", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(customRecipesTable)
      .where(eq(customRecipesTable.userId, userId))
      .orderBy(customRecipesTable.createdAt);
    res.json(rows);
  } catch (err) {
    logger.error(`[recipes GET] ${String(err)}`);
    res.status(500).json({ error: "Failed to fetch recipes" });
  }
});

// POST /api/recipes — create a new custom recipe
router.post("/recipes", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = RecipeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [count] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(customRecipesTable)
      .where(eq(customRecipesTable.userId, userId));
    const total = Number(count?.n ?? 0);
    if (total >= MAX_RECIPES_PER_USER) {
      res.status(400).json({ error: `You can save up to ${MAX_RECIPES_PER_USER} custom recipes.` });
      return;
    }
    const [row] = await db
      .insert(customRecipesTable)
      .values({ ...parsed.data, userId })
      .returning();
    res.status(201).json(row);
  } catch (err) {
    logger.error(`[recipes POST] ${String(err)}`);
    res.status(500).json({ error: "Failed to create recipe" });
  }
});

// PUT /api/recipes/:id — update an existing custom recipe
router.put("/recipes/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id ?? "0");
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid recipe id" });
    return;
  }
  const parsed = RecipeBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [existing] = await db
      .select({ id: customRecipesTable.id })
      .from(customRecipesTable)
      .where(and(eq(customRecipesTable.id, id), eq(customRecipesTable.userId, userId)));
    if (!existing) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    const [row] = await db
      .update(customRecipesTable)
      .set(parsed.data)
      .where(and(eq(customRecipesTable.id, id), eq(customRecipesTable.userId, userId)))
      .returning();
    res.json(row);
  } catch (err) {
    logger.error(`[recipes PUT] ${String(err)}`);
    res.status(500).json({ error: "Failed to update recipe" });
  }
});

// DELETE /api/recipes/:id — delete a custom recipe
router.delete("/recipes/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id ?? "0");
  if (!id || isNaN(id)) {
    res.status(400).json({ error: "Invalid recipe id" });
    return;
  }
  try {
    const deleted = await db
      .delete(customRecipesTable)
      .where(and(eq(customRecipesTable.id, id), eq(customRecipesTable.userId, userId)))
      .returning({ id: customRecipesTable.id });
    if (!deleted.length) {
      res.status(404).json({ error: "Recipe not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    logger.error(`[recipes DELETE] ${String(err)}`);
    res.status(500).json({ error: "Failed to delete recipe" });
  }
});

export default router;
