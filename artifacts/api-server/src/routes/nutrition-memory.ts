import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth.js";
import {
  getMealMemory,
  recordMealOutcome,
  saveMealMemory,
} from "../services/nutritionMealMemoryService.js";

const router: IRouter = Router();

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const outcomeSchema = z.enum(["loved", "some", "skipped"]);

const entrySchema = z.object({
  dateKey: dateKeySchema,
  mealSlot: z.string().min(1).max(40),
  mealName: z.string().min(1).max(200),
  mealKey: z.string().min(1).max(120),
  outcome: outcomeSchema,
  updatedAt: z.string(),
});

router.get("/nutrition/meal-memory", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = z.object({ childId: z.coerce.number().int().positive() }).safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query" });
    return;
  }

  const result = await getMealMemory(parsed.data.childId, userId);
  if (!result.ok) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json({ ok: true, entries: result.entries });
});

router.put("/nutrition/meal-memory", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({
    childId: z.number().int().positive(),
    entries: z.array(entrySchema).max(500),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const result = await saveMealMemory(parsed.data.childId, userId, parsed.data.entries);
  if (!result.ok) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json({ ok: true, entries: result.entries });
});

router.post("/nutrition/meal-outcome", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const bodySchema = z.object({
    childId: z.number().int().positive(),
    dateKey: dateKeySchema,
    mealSlot: z.string().min(1).max(40),
    mealName: z.string().min(1).max(200),
    outcome: outcomeSchema,
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }

  const result = await recordMealOutcome(parsed.data.childId, userId, parsed.data);
  if (!result.ok) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json({ ok: true, entries: result.entries });
});

export default router;
