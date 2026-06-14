import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth.js";
import {
  getCurrentStreak,
  getDailyScore,
  getWeeklyTrend,
  saveDailyScore,
} from "../services/nutritionTrackService.js";

const router: IRouter = Router();

const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const checklistSchema = z.record(z.string(), z.boolean());

// GET /api/nutrition/daily-score?childId=&date=
router.get("/nutrition/daily-score", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    childId: z.coerce.number().int().positive(),
    date: dateKeySchema,
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const result = await getDailyScore(parsed.data.childId, userId, parsed.data.date);
  if (!result.ok) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json({ ok: true, log: result.log });
});

// PUT /api/nutrition/daily-score
const upsertSchema = z.object({
  childId: z.number().int().positive(),
  dateKey: dateKeySchema,
  checklist: checklistSchema,
});

router.put("/nutrition/daily-score", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body", issues: parsed.error.flatten() });
    return;
  }

  const result = await saveDailyScore(
    parsed.data.childId,
    userId,
    parsed.data.dateKey,
    parsed.data.checklist,
  );
  if (!result.ok) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json({ ok: true, log: result.log });
});

// GET /api/nutrition/weekly-trend?childId=&date=
router.get("/nutrition/weekly-trend", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    childId: z.coerce.number().int().positive(),
    date: dateKeySchema.optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const endDateKey = parsed.data.date ?? new Date().toISOString().slice(0, 10);
  const result = await getWeeklyTrend(parsed.data.childId, userId, endDateKey);
  if (!result.ok) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json({ ok: true, days: result.days });
});

// GET /api/nutrition/streak?childId=&date=
router.get("/nutrition/streak", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const querySchema = z.object({
    childId: z.coerce.number().int().positive(),
    date: dateKeySchema.optional(),
  });
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_query", issues: parsed.error.flatten() });
    return;
  }

  const todayKey = parsed.data.date ?? new Date().toISOString().slice(0, 10);
  const result = await getCurrentStreak(parsed.data.childId, userId, todayKey);
  if (!result.ok) {
    res.status(403).json({ error: result.error });
    return;
  }

  res.json({ ok: true, streak: result.streak });
});

export default router;
