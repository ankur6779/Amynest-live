import { Router, type IRouter } from "express";
import { z } from "zod";
import { getAuth } from "../lib/auth.js";
import { resolveClientIp } from "../lib/device-metadata.js";
import {
  DEVICE_APP_VERSION_HEADER,
  DEVICE_BROWSER_HEADER,
  DEVICE_ID_HEADER,
  DEVICE_NAME_HEADER,
  DEVICE_OS_HEADER,
  DEVICE_PLATFORM_HEADER,
  deactivateDevice,
  listActiveDevicesForUser,
  registerOrRefreshDevice,
  replaceDevice,
  withLegacyIsCurrent,
} from "../services/deviceLimitService.js";
import {
  getOrCreateSubscription,
  isPremiumNow,
  resolveDevicesMax,
} from "../services/subscriptionService.js";
import {
  trackDeviceAnalytics,
  trackDeviceBypassAttempt,
} from "../services/deviceAnalyticsService.js";

const router: IRouter = Router();

const MetadataFields = {
  deviceName: z.string().max(120).optional().nullable(),
  platform: z.string().max(32).optional().nullable(),
  browser: z.string().max(64).optional().nullable(),
  os: z.string().max(64).optional().nullable(),
  appVersion: z.string().max(32).optional().nullable(),
};

const RegisterBody = z.object({
  deviceId: z.string().min(8).max(128),
  ...MetadataFields,
});

const ReplaceBody = z.object({
  removeDeviceId: z.string().min(8).max(128),
  deviceId: z.string().min(8).max(128),
  ...MetadataFields,
});

function readDeviceHeaders(req: import("express").Request) {
  const h = req.headers;
  const pick = (key: string) => {
    const v = h[key];
    return typeof v === "string" ? v.trim() : null;
  };
  return {
    deviceId: pick(DEVICE_ID_HEADER) ?? "",
    deviceName: pick(DEVICE_NAME_HEADER),
    platform: pick(DEVICE_PLATFORM_HEADER),
    browser: pick(DEVICE_BROWSER_HEADER),
    os: pick(DEVICE_OS_HEADER),
    appVersion: pick(DEVICE_APP_VERSION_HEADER),
  };
}

function mergeMetadata(
  req: import("express").Request,
  body: z.infer<typeof RegisterBody>,
) {
  const headers = readDeviceHeaders(req);
  return {
    deviceName: body.deviceName ?? headers.deviceName,
    platform: body.platform ?? headers.platform,
    browser: body.browser ?? headers.browser,
    os: body.os ?? headers.os,
    appVersion: body.appVersion ?? headers.appVersion,
    clientIp: resolveClientIp(req.headers["x-forwarded-for"], req.socket.remoteAddress),
  };
}

async function planLabel(userId: string): Promise<string> {
  const sub = await getOrCreateSubscription(userId);
  return isPremiumNow(sub) ? sub.plan : "free";
}

function serializeDevices(
  devices: Awaited<ReturnType<typeof listActiveDevicesForUser>>,
) {
  return devices.map((d) => withLegacyIsCurrent(d));
}

router.post("/devices/register", async (req, res): Promise<void> => {
  const { userId, email } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const metadata = mergeMetadata(req, parsed.data);
  const result = await registerOrRefreshDevice({
    userId,
    deviceId: parsed.data.deviceId,
    email,
    metadata,
  });

  const plan = await planLabel(userId);

  if (!result.ok) {
    void trackDeviceAnalytics(userId, "device_limit_reached", {
      limit: result.limit,
      activeCount: result.activeDeviceCount,
      platform: metadata.platform ?? "unknown",
      appVersion: metadata.appVersion,
    });
    void trackDeviceBypassAttempt({
      userId,
      plan,
      activeDeviceCount: result.activeDeviceCount,
      attemptedDevicePlatform: metadata.platform ?? "unknown",
      appVersion: metadata.appVersion,
      reason: "register_rejected",
    });
    res.status(402).json({
      error: result.error,
      message: result.message,
      limit: result.limit,
      devices: serializeDevices(result.devices),
    });
    return;
  }

  if (result.registered) {
    void trackDeviceAnalytics(userId, "device_registered", {
      platform: metadata.platform ?? "unknown",
      browser: metadata.browser,
      os: metadata.os,
      appVersion: metadata.appVersion,
    });
  }

  const sub = await getOrCreateSubscription(userId);
  const limit = resolveDevicesMax(isPremiumNow(sub), email);

  res.json({
    device: withLegacyIsCurrent(result.device),
    limit,
    registered: result.registered,
  });
});

router.get("/devices", async (req, res): Promise<void> => {
  const { userId, email } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const headers = readDeviceHeaders(req);
  const sub = await getOrCreateSubscription(userId);
  const limit = resolveDevicesMax(isPremiumNow(sub), email);
  const devices = await listActiveDevicesForUser(userId, headers.deviceId || undefined);

  res.json({ devices: serializeDevices(devices), limit });
});

router.delete("/devices/:deviceId", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const deviceId = req.params.deviceId?.trim();
  if (!deviceId) {
    res.status(400).json({ error: "device_id_required" });
    return;
  }

  const headers = readDeviceHeaders(req);
  if (headers.deviceId && headers.deviceId === deviceId) {
    res.status(400).json({
      error: "cannot_remove_current_device",
      message: "Use another device to remove this one, or replace it from a new device.",
    });
    return;
  }

  const result = await deactivateDevice(userId, deviceId);
  if (!result.ok) {
    res.status(404).json({ error: "device_not_found" });
    return;
  }

  void trackDeviceAnalytics(userId, "device_removed", { deviceId });
  res.sendStatus(204);
});

router.post("/devices/replace", async (req, res): Promise<void> => {
  const { userId, email } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = ReplaceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const metadata = mergeMetadata(req, parsed.data);
  const plan = await planLabel(userId);
  const activeBefore = (await listActiveDevicesForUser(userId, parsed.data.deviceId)).length;

  void trackDeviceBypassAttempt({
    userId,
    plan,
    activeDeviceCount: activeBefore,
    attemptedDevicePlatform: metadata.platform ?? "unknown",
    appVersion: metadata.appVersion,
    reason: "replace_initiated",
  });

  const result = await replaceDevice({
    userId,
    removeDeviceId: parsed.data.removeDeviceId,
    newDeviceId: parsed.data.deviceId,
    email,
    metadata,
  });

  if (!result.ok) {
    void trackDeviceAnalytics(userId, "device_limit_reached", {
      limit: result.limit,
      activeCount: result.activeDeviceCount,
      platform: metadata.platform ?? "unknown",
    });
    res.status(402).json({
      error: result.error,
      message: result.message,
      limit: result.limit,
      devices: serializeDevices(result.devices),
    });
    return;
  }

  void trackDeviceAnalytics(userId, "device_replaced", {
    removedDeviceId: parsed.data.removeDeviceId,
    platform: metadata.platform ?? "unknown",
    appVersion: metadata.appVersion,
  });

  const sub = await getOrCreateSubscription(userId);
  const limit = resolveDevicesMax(isPremiumNow(sub), email);

  res.json({
    device: withLegacyIsCurrent(result.device),
    limit,
    registered: result.registered,
  });
});

export default router;
