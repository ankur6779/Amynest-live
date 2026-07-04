import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { logger } from "../lib/logger";
import {
  buildWeeklySummary,
  getRetentionStatus,
  markDailyGoal,
  performDailyCheckin,
  saveResumeItem,
  touchInactive,
  updatePreferences,
} from "../services/retentionSystemService";

const router: IRouter = Router();

router.get("/retention/status", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const routinePct = Number(req.query.routineCompletionPct) || 0;
    const isTrialing = req.query.trialing === "1";
    const status = await getRetentionStatus(userId, {
      routineCompletionPct: routinePct,
      isTrialing,
    });
    res.json({ ok: true, ...status });
  } catch (err) {
    logger.error(`retention status failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

const checkinSchema = z.object({
  useShield: z.boolean().optional(),
});

router.post("/retention/checkin", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = checkinSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const result = await performDailyCheckin(userId, parsed.data);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error(`retention checkin failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

const goalSchema = z.object({
  goal: z.enum(["routine", "story", "activity", "speech"]),
});

router.post("/retention/goal", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = goalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const result = await markDailyGoal(userId, parsed.data.goal);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error(`retention goal failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

const resumeSchema = z.object({
  type: z.enum(["routine", "story", "learning", "speech", "worksheet", "game"]),
  href: z.string().max(512),
  label: z.string().max(256),
  progressPct: z.number().min(0).max(100),
});

router.post("/retention/resume", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = resumeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const item = {
      ...parsed.data,
      updatedAt: new Date().toISOString(),
    };
    const row = await saveResumeItem(userId, item);
    res.json({ ok: true, resumeItems: row.resumeItems });
  } catch (err) {
    logger.error(`retention resume failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

const prefsSchema = z.object({
  favoriteStories: z.array(z.string()).optional(),
  favoriteGames: z.array(z.string()).optional(),
  favoriteFoods: z.array(z.string()).optional(),
  preferredBedtime: z.string().optional(),
  preferredWakeTime: z.string().optional(),
  preferredLearningCategory: z.string().optional(),
});

router.patch("/retention/preferences", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const row = await updatePreferences(userId, parsed.data);
    res.json({ ok: true, preferences: row.preferences });
  } catch (err) {
    logger.error(`retention prefs failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

const weeklySchema = z.object({
  routineCompletionPct: z.number().min(0).max(100),
  learningMinutes: z.number().min(0),
  storiesCompleted: z.number().min(0),
  speechSessions: z.number().min(0),
  nutritionScore: z.number().min(0).max(100),
  parentingScore: z.number().min(0).max(100),
});

router.post("/retention/weekly-summary", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const parsed = weeklySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_body" });
    return;
  }
  try {
    const summary = await buildWeeklySummary(userId, parsed.data);
    res.json({ ok: true, summary });
  } catch (err) {
    logger.error(`retention weekly failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

router.post("/retention/touch", async (req, res): Promise<void> => {
  const userId = getAuth(req).userId;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  try {
    const row = await touchInactive(userId);
    res.json({
      ok: true,
      inactiveDays: row.inactiveDays,
      winbackLevel: row.winbackLevel,
    });
  } catch (err) {
    logger.error(`retention touch failed: ${err instanceof Error ? err.message : String(err)}`);
    res.status(500).json({ error: "server_error" });
  }
});

export default router;
