import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { z } from "zod";
import { db, pushTokensTable } from "@workspace/db";

const router: IRouter = Router();

const PLATFORMS = ["ios", "android", "web", "unknown"] as const;

const registerSchema = z.object({
  token: z.string().trim().min(1).max(512),
  platform: z.enum(PLATFORMS).optional(),
  deviceName: z.string().trim().max(200).nullish(),
});

const unregisterSchema = z.object({
  token: z.string().trim().min(1).max(512),
});

/**
 * POST /api/push/register
 * Body: { token: string; platform?: "ios"|"android"|"web"|"unknown"; deviceName?: string }
 * Atomic upsert of the Expo push token bound to the current user.
 */
router.post("/push/register", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body" });
    return;
  }
  const { token } = parsed.data;
  const platform = parsed.data.platform ?? "unknown";
  const deviceName = parsed.data.deviceName ?? null;

  // Atomic upsert keyed by unique token. If the token already belongs to a
  // different user (legit case: device handed off between accounts), ownership
  // is transferred — Expo push tokens are per device-app install, so only one
  // owner at a time is correct.
  await db
    .insert(pushTokensTable)
    .values({ userId, token, platform, deviceName })
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: {
        userId,
        platform,
        deviceName,
        lastSeenAt: sql`now()`,
      },
    });

  res.json({ ok: true });
});

/**
 * DELETE /api/push/unregister
 * Body: { token: string }
 * Removes a token (e.g. on sign-out or permission revocation). Only the owner
 * can unregister their own token.
 */
router.delete("/push/unregister", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = unregisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body" });
    return;
  }
  await db
    .delete(pushTokensTable)
    .where(
      and(
        eq(pushTokensTable.token, parsed.data.token),
        eq(pushTokensTable.userId, userId),
      ),
    );
  res.json({ ok: true });
});

export default router;
