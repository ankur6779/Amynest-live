import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, analyticsEventsTable } from "@workspace/db";

const DEVICE_EVENTS = [
  "device_registered",
  "device_removed",
  "device_replaced",
  "device_limit_reached",
  "device_limit_bypass_attempt",
  "device_header_missing",
] as const;

export type DeviceMetricsPeriod = "day" | "week";

function periodStart(period: DeviceMetricsPeriod): Date {
  const now = new Date();
  const days = period === "week" ? 7 : 1;
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export type DeviceEventAggregate = {
  eventName: string;
  count: number;
};

export type DeviceMetricsReport = {
  period: DeviceMetricsPeriod;
  since: string;
  until: string;
  totals: DeviceEventAggregate[];
  registrationSuccessRate: number | null;
  missingHeaderRate: number | null;
  bypassAttempts: number;
};

/**
 * Aggregates device lifecycle events from analytics_events for admin monitoring.
 */
export async function computeDeviceMetrics(
  period: DeviceMetricsPeriod = "day",
): Promise<DeviceMetricsReport> {
  const since = periodStart(period);
  const until = new Date();

  const rows = await db
    .select({
      eventName: analyticsEventsTable.eventName,
      count: sql<number>`count(*)::int`,
    })
    .from(analyticsEventsTable)
    .where(
      and(
        gte(analyticsEventsTable.serverTs, since),
        inArray(analyticsEventsTable.eventName, [...DEVICE_EVENTS]),
      ),
    )
    .groupBy(analyticsEventsTable.eventName);

  const totals: DeviceEventAggregate[] = DEVICE_EVENTS.map((name) => ({
    eventName: name,
    count: rows.find((r) => r.eventName === name)?.count ?? 0,
  }));

  const registered = totals.find((t) => t.eventName === "device_registered")?.count ?? 0;
  const limitReached = totals.find((t) => t.eventName === "device_limit_reached")?.count ?? 0;
  const headerMissing = totals.find((t) => t.eventName === "device_header_missing")?.count ?? 0;
  const bypassAttempts =
    totals.find((t) => t.eventName === "device_limit_bypass_attempt")?.count ?? 0;

  const registerAttempts = registered + limitReached;
  const registrationSuccessRate =
    registerAttempts > 0 ? Math.round((registered / registerAttempts) * 1000) / 10 : null;

  const authedRequestsProxy = registered + headerMissing + limitReached;
  const missingHeaderRate =
    authedRequestsProxy > 0
      ? Math.round((headerMissing / authedRequestsProxy) * 1000) / 10
      : null;

  return {
    period,
    since: since.toISOString(),
    until: until.toISOString(),
    totals,
    registrationSuccessRate,
    missingHeaderRate,
    bypassAttempts,
  };
}

export type StrictReadinessSnapshot = {
  generatedAt: string;
  daily: DeviceMetricsReport;
  weekly: DeviceMetricsReport;
  clientHeaderAudit: {
    sendsDeviceId: boolean;
    sendsPlatform: boolean;
    sendsDeviceName: boolean;
    sendsBrowser: boolean;
    sendsOs: boolean;
    sendsAppVersion: boolean;
  };
  recommendation: "ENABLE" | "DELAY";
  recommendationReasons: string[];
};

export async function assessStrictReadiness(): Promise<StrictReadinessSnapshot> {
  const [daily, weekly] = await Promise.all([
    computeDeviceMetrics("day"),
    computeDeviceMetrics("week"),
  ]);

  const reasons: string[] = [];
  let recommendation: "ENABLE" | "DELAY" = "ENABLE";

  const regRate = weekly.registrationSuccessRate;
  if (regRate == null) {
    recommendation = "DELAY";
    reasons.push("Insufficient registration telemetry in the last 7 days.");
  } else if (regRate < 95) {
    recommendation = "DELAY";
    reasons.push(`Registration success rate ${regRate}% is below 95% threshold.`);
  }

  const missingRate = weekly.missingHeaderRate;
  if (missingRate != null && missingRate > 5) {
    recommendation = "DELAY";
    reasons.push(`Missing device header rate ${missingRate}% exceeds 5% tolerance.`);
  }

  if (weekly.bypassAttempts > 50) {
    reasons.push(
      `Elevated bypass attempts (${weekly.bypassAttempts}/week) — review abuse patterns before strict mode.`,
    );
  }

  if (reasons.length === 0) {
    reasons.push("Registration success and header coverage meet rollout thresholds.");
  }

  return {
    generatedAt: new Date().toISOString(),
    daily,
    weekly,
    clientHeaderAudit: {
      sendsDeviceId: true,
      sendsPlatform: true,
      sendsDeviceName: true,
      sendsBrowser: true,
      sendsOs: true,
      sendsAppVersion: true,
    },
    recommendation,
    recommendationReasons: reasons,
  };
}
