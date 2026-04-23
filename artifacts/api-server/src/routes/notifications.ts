import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getAuth } from "../lib/auth";
import { db, parentProfilesTable } from "@workspace/db";
import { sendRecapForUser, dispatchWeeklyRecaps } from "../services/weeklyRecapService";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/notifications/preferences", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [profile] = await db
    .select({
      emailNotificationsEnabled: parentProfilesTable.emailNotificationsEnabled,
      lastWeeklyRecapSentAt: parentProfilesTable.lastWeeklyRecapSentAt,
    })
    .from(parentProfilesTable)
    .where(eq(parentProfilesTable.userId, userId))
    .limit(1);

  res.json({
    emailNotificationsEnabled: profile?.emailNotificationsEnabled ?? true,
    lastWeeklyRecapSentAt: profile?.lastWeeklyRecapSentAt
      ? new Date(profile.lastWeeklyRecapSentAt).toISOString()
      : null,
  });
});

const PatchPreferencesSchema = z.object({
  emailNotificationsEnabled: z.boolean(),
});

router.patch("/notifications/preferences", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = PatchPreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  await db
    .update(parentProfilesTable)
    .set({
      emailNotificationsEnabled: parsed.data.emailNotificationsEnabled,
      updatedAt: new Date(),
    })
    .where(eq(parentProfilesTable.userId, userId));
  res.json({ emailNotificationsEnabled: parsed.data.emailNotificationsEnabled });
});

router.post("/notifications/recap/send-now", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const includePreview = req.query.preview === "1";
    const result = await sendRecapForUser({
      userId,
      bypassRecentGuard: true,
      includePreview,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err, userId }, "send-now failed");
    res.status(500).json({ error: "Could not send recap" });
  }
});

// Admin trigger for the cron job — protected by BOTH a shared secret AND
// allowlisted admin userIds (defense in depth). Useful for external schedulers
// (e.g. Replit Scheduled Deployments) when the in-process cron isn't desired.
function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  const list = (process.env["ADMIN_USER_IDS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(userId);
}

router.post("/notifications/recap/dispatch-all", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!isAdminUser(userId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const expected = process.env["RECAP_DISPATCH_SECRET"];
  const provided = req.headers["x-dispatch-secret"];
  if (!expected || provided !== expected) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const result = await dispatchWeeklyRecaps();
    res.json(result);
  } catch (err) {
    logger.error({ err }, "dispatch-all failed");
    res.status(500).json({ error: "Dispatch failed" });
  }
});

export default router;
