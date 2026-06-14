import { db, analyticsEventsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

export type DeviceAnalyticsEvent =
  | "device_registered"
  | "device_removed"
  | "device_limit_reached"
  | "device_replaced"
  | "device_limit_bypass_attempt"
  | "device_header_missing";

export type DeviceBypassContext = {
  userId: string;
  plan: string;
  activeDeviceCount: number;
  attemptedDevicePlatform?: string;
  appVersion?: string | null;
  reason: "register_rejected" | "replace_initiated" | "missing_header";
};

/** Best-effort device lifecycle analytics — stored in analytics_events spine. */
export async function trackDeviceAnalytics(
  userId: string,
  event: DeviceAnalyticsEvent,
  props: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.insert(analyticsEventsTable).values({
      userId,
      eventName: event,
      eventCategory: "premium",
      props,
      sessionId: "server",
      clientTs: new Date(),
    });
  } catch (err) {
    logger.warn({ err, evt: event, userId }, "Device analytics insert failed");
  }
}

export async function trackDeviceBypassAttempt(ctx: DeviceBypassContext): Promise<void> {
  await trackDeviceAnalytics(ctx.userId, "device_limit_bypass_attempt", {
    plan: ctx.plan,
    activeDeviceCount: ctx.activeDeviceCount,
    attemptedDevicePlatform: ctx.attemptedDevicePlatform ?? "unknown",
    appVersion: ctx.appVersion ?? null,
    reason: ctx.reason,
  });
}
