import type { Request, Response, NextFunction } from "express";
import { getAuth } from "../lib/auth.js";
import {
  DEVICE_APP_VERSION_HEADER,
  DEVICE_ID_HEADER,
  DEVICE_NAME_HEADER,
  DEVICE_PLATFORM_HEADER,
  getActiveDevice,
  touchDevice,
} from "../services/deviceLimitService.js";
import { isDeviceLimitExempt } from "../services/deviceLimitLogic.js";
import { trackDeviceAnalytics } from "../services/deviceAnalyticsService.js";
import { logger } from "../lib/logger.js";

const EXEMPT_PATH_PREFIXES = [
  "/devices",
  "/subscription",
  "/healthz",
  "/analytics/events",
  "/logs",
  "/startup-events",
  "/push/register",
  "/admin/analytics",
];

function isExemptPath(path: string): boolean {
  const normalized = path.replace(/^\/api/, "") || path;
  return EXEMPT_PATH_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`),
  );
}

function deviceEnforcementEnabled(): boolean {
  return process.env.DEVICE_LIMIT_ENFORCE !== "0";
}

function readHeader(req: Request, key: string): string {
  const raw = req.headers[key];
  return typeof raw === "string" ? raw.trim() : "";
}

function missingHeaders(req: Request): string[] {
  const missing: string[] = [];
  if (!readHeader(req, DEVICE_ID_HEADER)) missing.push("deviceId");
  if (!readHeader(req, DEVICE_PLATFORM_HEADER)) missing.push("platform");
  if (!readHeader(req, DEVICE_NAME_HEADER)) missing.push("deviceName");
  return missing;
}

/**
 * Backend device gate — requires a registered active device for authenticated
 * API calls. Mount after requireAuth. Device registration routes are exempt.
 */
export async function requireRegisteredDevice(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (!deviceEnforcementEnabled()) {
    next();
    return;
  }

  const path = req.originalUrl?.split("?")[0] ?? req.path;
  if (isExemptPath(path)) {
    next();
    return;
  }

  const auth = getAuth(req);
  const { userId, email } = auth;
  if (!userId) {
    next();
    return;
  }

  if (isDeviceLimitExempt(email)) {
    next();
    return;
  }

  const deviceId = readHeader(req, DEVICE_ID_HEADER);
  const missing = missingHeaders(req);

  if (missing.length > 0) {
    void trackDeviceAnalytics(userId, "device_header_missing", {
      missing,
      path,
      hasAppVersion: !!readHeader(req, DEVICE_APP_VERSION_HEADER),
    });
  }

  if (!deviceId) {
    if (process.env.DEVICE_LIMIT_STRICT === "1") {
      res.status(403).json({
        error: "device_id_required",
        message: "Device identification is required. Please update the app and sign in again.",
      });
      return;
    }
    next();
    return;
  }

  const device = await getActiveDevice(userId, deviceId);
  if (!device) {
    logger.warn(
      {
        evt: "device.not_registered",
        userId,
        deviceId,
        path,
      },
      "Blocked request from unregistered device",
    );
    res.status(403).json({
      error: "device_not_registered",
      message: "This device is not registered. Please sign in again.",
    });
    return;
  }

  void touchDevice(userId, deviceId).catch(() => {});
  next();
}
