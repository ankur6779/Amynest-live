/**
 * Infant smart notification API — prefs sync, snooze, analytics outcomes.
 */
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, infantNotificationPrefsTable } from "@workspace/db";
import { getAuth } from "../lib/auth";
import { canAccessChild } from "../lib/child-access";
import {
  loadOrCreateInfantPrefs,
  runInfantNotificationTick,
  snoozeInfantNotification,
} from "../lib/infantNotificationScheduler.js";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const prefsSchema = z.object({
  napReminders: z.boolean().optional(),
  feedReminders: z.boolean().optional(),
  vaccineReminders: z.boolean().optional(),
  milestoneTips: z.boolean().optional(),
  sleepDrift: z.boolean().optional(),
  weeklySleepReport: z.boolean().optional(),
  maxPerDay: z.number().int().min(1).max(3).optional(),
});

const snoozeSchema = z.object({
  kind: z.enum([
    "nap_window",
    "feed_reminder",
    "vaccine_due",
    "milestone_tip",
    "sleep_drift",
    "sleep_weekly_report",
  ]),
  hours: z.union([z.literal(1), z.literal(4), z.literal(24)]),
});

router.get("/infant-notifications/prefs/:childId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId)) {
    res.status(400).json({ error: "Invalid childId" });
    return;
  }
  const access = await canAccessChild(childId, userId);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const prefs = await loadOrCreateInfantPrefs(userId, childId);
  res.json({
    ok: true,
    prefs: {
      napReminders: prefs.napReminders,
      feedReminders: prefs.feedReminders,
      vaccineReminders: prefs.vaccineReminders,
      milestoneTips: prefs.milestoneTips,
      sleepDrift: prefs.sleepDrift,
      weeklySleepReport: prefs.weeklySleepReport,
      maxPerDay: prefs.maxPerDay,
      snoozeUntil: prefs.snoozeUntil ?? {},
    },
  });
});

router.put("/infant-notifications/prefs/:childId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  if (!Number.isFinite(childId)) {
    res.status(400).json({ error: "Invalid childId" });
    return;
  }
  const access = await canAccessChild(childId, userId);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  await loadOrCreateInfantPrefs(userId, childId);
  const [updated] = await db
    .update(infantNotificationPrefsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(
      and(
        eq(infantNotificationPrefsTable.userId, userId),
        eq(infantNotificationPrefsTable.childId, childId),
      ),
    )
    .returning();

  res.json({ ok: true, prefs: updated });
});

router.post("/infant-notifications/snooze/:childId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const childId = Number(req.params.childId);
  const access = await canAccessChild(childId, userId);
  if (!access) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const parsed = snoozeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  await snoozeInfantNotification(userId, childId, parsed.data.kind, parsed.data.hours);
  res.json({ ok: true, snoozedUntilHours: parsed.data.hours, kind: parsed.data.kind });
});

router.post("/infant-notifications/outcome", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const schema = z.object({
    action: z.enum(["opened", "dismissed", "sent"]),
    kind: z.string().optional(),
    childId: z.number().optional(),
    dedupKey: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  logger.info(
    {
      evt: `infant_notification.${parsed.data.action}`,
      userId,
      ...parsed.data,
    },
    "Infant notification outcome",
  );

  if (parsed.data.action === "opened") {
    const { recordNotificationOpened } = await import(
      "../services/notificationContentHistoryService.js"
    );
    await recordNotificationOpened(userId);
  } else if (parsed.data.action === "dismissed") {
    const { recordNotificationDismissed } = await import(
      "../services/notificationContentHistoryService.js"
    );
    await recordNotificationDismissed(userId);
  }

  res.json({ ok: true });
});

/** Admin/cron ping — evaluate infant notifications once. */
router.post("/infant-notifications/tick", async (req, res): Promise<void> => {
  const { shouldAcceptHttpCronTrigger, schedulerStandbyResponse } = await import(
    "../lib/single-active-scheduler.js"
  );
  if (!shouldAcceptHttpCronTrigger()) {
    const standby = schedulerStandbyResponse();
    res.status(standby.status).json(standby.body);
    return;
  }
  const cronSecret = process.env["CRON_SECRET"];
  const header = req.headers["x-cron-secret"];
  if (cronSecret && header !== cronSecret) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const result = await runInfantNotificationTick();
  res.json({ ok: true, ...result });
});

export default router;
