/**
 * Register feature reminder preferences — server cron delivers pushes.
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { canAccessChild } from "../lib/child-access";
import { upsertFeatureSchedule } from "../services/featureNotificationScheduler.js";

const router: IRouter = Router();

const scheduleBody = z.object({
  scheduleType: z.enum(["event_prep", "sleep_winddown"]),
  entityId: z.string().min(1).max(128),
  childId: z.number().int().positive().optional(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.unknown()).optional(),
});

router.put("/feature-notification-schedules", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = scheduleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (parsed.data.childId != null) {
    const access = await canAccessChild(parsed.data.childId, userId);
    if (!access) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  await upsertFeatureSchedule({
    userId,
    childId: parsed.data.childId ?? null,
    scheduleType: parsed.data.scheduleType,
    entityId: parsed.data.entityId,
    enabled: parsed.data.enabled,
    config: parsed.data.config,
  });

  res.json({ ok: true });
});

export default router;
