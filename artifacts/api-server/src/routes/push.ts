import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { getAuth } from "../lib/auth";
import { z } from "zod";
import { db, pushTokensTable } from "@workspace/db";
import { count } from "drizzle-orm";
import {
  linkAnonymousDeviceToUser,
  registerAnonymousDevice,
} from "../services/anonymousDeviceService.js";

const router: IRouter = Router();

const DEVICE_ID_HEADER = "x-amynest-device-id";

const PLATFORMS = ["ios", "ios-capacitor", "android", "web", "unknown"] as const;

const registerSchema = z.object({
  token: z.string().trim().min(1).max(512),
  platform: z.enum(PLATFORMS).optional(),
  deviceName: z.string().trim().max(200).nullish(),
});

const unregisterSchema = z.object({
  token: z.string().trim().min(1).max(512),
});

const anonymousRegisterSchema = z.object({
  deviceId: z.string().trim().min(8).max(128),
  token: z.string().trim().min(1).max(512),
  platform: z.enum(PLATFORMS).optional(),
  deviceName: z.string().trim().max(200).nullish(),
  locale: z.string().trim().max(16).nullish(),
  timezone: z.string().trim().max(64).optional(),
});

const linkDeviceSchema = z.object({
  deviceId: z.string().trim().min(8).max(128),
});

function looksLikeApnsDeviceTokenHex(t: string): boolean {
  return /^[0-9a-f]{64}$/i.test(t.trim());
}

/**
 * POST /api/push/register
 * Body: { token: string; platform?: "ios"|"ios-capacitor"|"android"|"web"|"unknown"; deviceName?: string }
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

  if (platform === "ios-capacitor" && looksLikeApnsDeviceTokenHex(token)) {
    res.status(400).json({
      ok: false,
      error: "apns_token_not_deliverable",
      message: "Waiting for Firebase FCM token — reopen the app after allowing notifications.",
    });
    return;
  }

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

  // Capacitor used to POST raw APNs hex; those rows are never dispatched (FCM-only path).
  // Drop them once we have a real FCM registration token for this user.
  if (platform === "ios-capacitor" && !looksLikeApnsDeviceTokenHex(token)) {
    await db.delete(pushTokensTable).where(
      and(
        eq(pushTokensTable.userId, userId),
        sql`trim(${pushTokensTable.token}) ~ '^[0-9a-fA-F]{64}$'`,
      ),
    );
    // One active iOS install token — drop stale FCM rows that cause all_tokens_failed on test.
    await db.delete(pushTokensTable).where(
      and(
        eq(pushTokensTable.userId, userId),
        eq(pushTokensTable.platform, "ios-capacitor"),
        sql`${pushTokensTable.token} <> ${token}`,
      ),
    );
  }

  const deviceIdHeader = req.header(DEVICE_ID_HEADER)?.trim();
  if (deviceIdHeader) {
    await linkAnonymousDeviceToUser(deviceIdHeader, userId).catch(() => undefined);
  }

  res.json({ ok: true });
});

/**
 * POST /api/push/register-anonymous
 * Pre-signup FCM registration — no auth required.
 */
router.post("/push/register-anonymous", async (req, res): Promise<void> => {
  const parsed = anonymousRegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body" });
    return;
  }
  const { deviceId, token } = parsed.data;
  const platform = parsed.data.platform ?? "unknown";

  if (platform === "ios-capacitor" && looksLikeApnsDeviceTokenHex(token)) {
    res.status(400).json({
      ok: false,
      error: "apns_token_not_deliverable",
    });
    return;
  }

  await registerAnonymousDevice({
    deviceId,
    pushToken: token,
    platform,
    deviceName: parsed.data.deviceName ?? null,
    locale: parsed.data.locale ?? null,
    timezone: parsed.data.timezone,
  });

  res.json({ ok: true });
});

/**
 * POST /api/push/link-device
 * Links a previously anonymous device to the authenticated user.
 */
router.post("/push/link-device", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = linkDeviceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body" });
    return;
  }
  const result = await linkAnonymousDeviceToUser(parsed.data.deviceId, userId);
  res.json(result);
});

/**
 * GET /api/push/status
 * Returns { registered: boolean } — whether the current user has any active
 * web push token stored. Used by the dashboard nudge banner.
 */
router.get("/push/status", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const [{ value }] = await db
    .select({ value: count() })
    .from(pushTokensTable)
    .where(
      and(
        eq(pushTokensTable.userId, userId),
        eq(pushTokensTable.platform, "web"),
      ),
    );
  res.json({ registered: (value ?? 0) > 0 });
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
