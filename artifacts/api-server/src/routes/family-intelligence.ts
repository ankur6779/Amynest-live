import { Router, type IRouter } from "express";
import { getAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import {
  getFamilyCommandCenter,
  refreshFamilyIntelligence,
  recordFamilyMemory,
  upsertFamilyGoal,
} from "../services/unifiedFamilyIntelligenceService.js";

const router: IRouter = Router();

/**
 * GET /api/family-intelligence/command-center
 * Executive command center — health, risk, goals, predictions, actions.
 */
router.get("/family-intelligence/command-center", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const view = await getFamilyCommandCenter(userId);
    res.json(view);
  } catch (err) {
    logger.error({ err, userId }, "Family command center failed");
    res.status(500).json({ error: "command_center_failed" });
  }
});

/**
 * GET /api/family-intelligence/snapshot
 * Full intelligence snapshot for product orchestration.
 */
router.get("/family-intelligence/snapshot", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const snapshot = await refreshFamilyIntelligence(userId);
    res.json(snapshot);
  } catch (err) {
    logger.error({ err, userId }, "Family intelligence refresh failed");
    res.status(500).json({ error: "snapshot_failed" });
  }
});

/**
 * GET /api/family-intelligence/weekly-report
 */
router.get("/family-intelligence/weekly-report", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const snapshot = await refreshFamilyIntelligence(userId);
    res.json(snapshot.weeklyReport);
  } catch (err) {
    logger.error({ err, userId }, "Weekly report failed");
    res.status(500).json({ error: "weekly_report_failed" });
  }
});

/**
 * POST /api/family-intelligence/goals
 * Set a family goal (reading, routine, learning, screen_time).
 */
router.post("/family-intelligence/goals", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { goalType, target, targetValue, unit, childId } = req.body ?? {};
  const validTypes = new Set(["reading", "routine", "learning", "screen_time"]);
  if (!goalType || !validTypes.has(String(goalType)) || !target) {
    res.status(400).json({ error: "invalid_goal" });
    return;
  }
  try {
    await upsertFamilyGoal(userId, {
      goalType: String(goalType),
      target: String(target),
      targetValue: targetValue != null ? Number(targetValue) : undefined,
      unit: unit != null ? String(unit) : undefined,
      childId: childId != null ? Number(childId) : undefined,
    });
    const snapshot = await refreshFamilyIntelligence(userId);
    res.json({ ok: true, goals: snapshot.goals });
  } catch (err) {
    logger.error({ err, userId }, "Goal upsert failed");
    res.status(500).json({ error: "goal_failed" });
  }
});

/**
 * POST /api/family-intelligence/memory
 * Record what worked for long-term family memory.
 */
router.post("/family-intelligence/memory", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { category, key, outcome, context } = req.body ?? {};
  const validCategories = new Set(["intervention", "notification", "learning_style", "reward_style"]);
  const validOutcomes = new Set(["positive", "neutral", "negative"]);
  if (!category || !validCategories.has(String(category)) || !key || !outcome || !validOutcomes.has(String(outcome))) {
    res.status(400).json({ error: "invalid_memory" });
    return;
  }
  try {
    await recordFamilyMemory(userId, {
      category: String(category),
      key: String(key),
      outcome: String(outcome),
      context: context != null ? String(context) : undefined,
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId }, "Memory record failed");
    res.status(500).json({ error: "memory_failed" });
  }
});

export default router;
