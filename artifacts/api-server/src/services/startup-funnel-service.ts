/**
 * Persists startup funnel telemetry to PostgreSQL for conversion diagnostics.
 */
import { db, startupFunnelEventsTable, type InsertStartupFunnelEvent } from "@workspace/db";
import {
  classifyStartupFunnelEvent,
  type StartupFunnelEventPayload,
} from "@workspace/analytics-taxonomy";
import { sql } from "drizzle-orm";

export type StartupFunnelIngestSummary = {
  received: number;
  accepted: number;
  rejected: number;
};

function toDate(ms: number | undefined): Date | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d;
}

function payloadToRow(payload: StartupFunnelEventPayload): InsertStartupFunnelEvent {
  const eventType = payload.event_type ?? classifyStartupFunnelEvent(payload.event_name);
  return {
    eventName: payload.event_name,
    eventType,
    clientTs: toDate(payload.client_ts),
    elapsedMs: payload.elapsed_ms ?? null,
    sessionId: payload.session_id,
    installId: payload.install_id,
    deviceId: payload.device_id,
    deviceModel: payload.device_model ?? null,
    manufacturer: payload.manufacturer ?? null,
    androidVersion: payload.android_version ?? null,
    webviewVersion: payload.webview_version ?? null,
    appVersion: payload.app_version ?? null,
    buildNumber: payload.build_number ?? null,
    networkType: payload.network_type ?? null,
    carrier: payload.carrier ?? null,
    locale: payload.locale ?? null,
    timezone: payload.timezone ?? null,
    memoryClass: payload.memory_class ?? null,
    batterySaver: payload.battery_saver ?? null,
    platform: payload.platform ?? null,
    country: payload.country ?? null,
    language: payload.language ?? null,
    screenWidth: payload.screen_width ?? null,
    screenHeight: payload.screen_height ?? null,
    cpuArchitecture: payload.cpu_architecture ?? null,
    playStoreVersion: payload.play_store_version ?? null,
    startupPhase: payload.startup_phase ?? null,
    startType: payload.start_type ?? null,
    failureStack: payload.failure_stack?.slice(0, 8000) ?? null,
    failureFile: payload.failure_file ?? null,
    failureLine: payload.failure_line ?? null,
    meta: payload.meta ?? {},
  };
}

export async function ingestStartupFunnelEvents(
  events: StartupFunnelEventPayload[],
): Promise<StartupFunnelIngestSummary> {
  const summary: StartupFunnelIngestSummary = {
    received: events.length,
    accepted: 0,
    rejected: 0,
  };
  if (events.length === 0) return summary;

  const rows = events.map(payloadToRow);
  try {
    await db.insert(startupFunnelEventsTable).values(rows);
    summary.accepted = rows.length;
  } catch {
    summary.rejected = rows.length;
  }
  return summary;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))]!;
}

export type StartupFunnelDashboardStats = {
  periodDays: number;
  sampleCount: number;
  uniqueDevices: number;
  uniqueInstalls: number;
  startupSuccessRate: number;
  startupFailureRate: number;
  blankScreenRate: number;
  whiteScreenRate: number;
  timeoutRate: number;
  offlineLaunchRate: number;
  cacheRecoveryRate: number;
  firebaseFailureRate: number;
  authFailureRate: number;
  loginReachRate: number;
  signupReachRate: number;
  signupConversionRate: number;
  accountCreationRate: number;
  durations: {
    coldStartMs: { p50: number; p75: number; p90: number; p95: number; p99: number };
    timeToReactMs: { p50: number; p75: number; p90: number; p95: number; p99: number };
    timeToLoginMs: { p50: number; p75: number; p90: number; p95: number; p99: number };
    timeToAppCoreMs: { p50: number; p75: number; p90: number; p95: number; p99: number };
    firebaseWaitMs: { p50: number; p75: number; p90: number; p95: number; p99: number };
    authWaitMs: { p50: number; p75: number; p90: number; p95: number; p99: number };
  };
  funnel: Array<{ step: string; devices: number; dropPct: number }>;
  topFailureEvents: Array<{ eventName: string; count: number }>;
  topSlowDevices: Array<{ manufacturer: string; deviceModel: string; p95Ms: number; count: number }>;
  topFailedDevices: Array<{ manufacturer: string; deviceModel: string; failures: number; devices: number }>;
};

export async function getStartupFunnelDashboardStats(
  periodDays = 7,
): Promise<StartupFunnelDashboardStats> {
  const since = new Date(Date.now() - periodDays * 86_400_000);

  const [sampleRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(startupFunnelEventsTable)
    .where(sql`${startupFunnelEventsTable.serverTs} >= ${since}`);

  const [deviceRow] = await db
    .select({ count: sql<number>`count(distinct ${startupFunnelEventsTable.deviceId})::int` })
    .from(startupFunnelEventsTable)
    .where(sql`${startupFunnelEventsTable.serverTs} >= ${since}`);

  const [installRow] = await db
    .select({ count: sql<number>`count(distinct ${startupFunnelEventsTable.installId})::int` })
    .from(startupFunnelEventsTable)
    .where(sql`${startupFunnelEventsTable.serverTs} >= ${since}`);

  const sampleCount = sampleRow?.count ?? 0;
  const uniqueDevices = deviceRow?.count ?? 0;
  const uniqueInstalls = installRow?.count ?? 0;

  const rateFor = async (eventName: string): Promise<number> => {
    if (uniqueInstalls === 0) return 0;
    const [row] = await db
      .select({
        count: sql<number>`count(distinct ${startupFunnelEventsTable.installId})::int`,
      })
      .from(startupFunnelEventsTable)
      .where(
        sql`${startupFunnelEventsTable.serverTs} >= ${since}
            AND ${startupFunnelEventsTable.eventName} = ${eventName}`,
      );
    return (row?.count ?? 0) / uniqueInstalls;
  };

  const failureRate = async (): Promise<number> => {
    if (uniqueInstalls === 0) return 0;
    const [row] = await db
      .select({
        count: sql<number>`count(distinct ${startupFunnelEventsTable.installId})::int`,
      })
      .from(startupFunnelEventsTable)
      .where(
        sql`${startupFunnelEventsTable.serverTs} >= ${since}
            AND ${startupFunnelEventsTable.eventType} = 'failure'`,
      );
    return (row?.count ?? 0) / uniqueInstalls;
  };

  const durationPercentiles = async (
    startEvent: string,
    endEvent: string,
  ): Promise<{ p50: number; p75: number; p90: number; p95: number; p99: number }> => {
    const rows = await db.execute<{ elapsed_ms: number }>(sql`
      SELECT (end_evt.elapsed_ms - start_evt.elapsed_ms) AS elapsed_ms
      FROM startup_funnel_events start_evt
      JOIN startup_funnel_events end_evt
        ON start_evt.session_id = end_evt.session_id
       AND start_evt.install_id = end_evt.install_id
      WHERE start_evt.server_ts >= ${since}
        AND start_evt.event_name = ${startEvent}
        AND end_evt.event_name = ${endEvent}
        AND end_evt.elapsed_ms IS NOT NULL
        AND start_evt.elapsed_ms IS NOT NULL
        AND end_evt.elapsed_ms >= start_evt.elapsed_ms
    `);
    const values = (rows.rows ?? [])
      .map((r) => Number(r.elapsed_ms))
      .filter((n) => Number.isFinite(n) && n >= 0)
      .sort((a, b) => a - b);
    return {
      p50: percentile(values, 50),
      p75: percentile(values, 75),
      p90: percentile(values, 90),
      p95: percentile(values, 95),
      p99: percentile(values, 99),
    };
  };

  const funnelSteps = [
    "app_install_first_open",
    "app_open",
    "webview_page_finished",
    "react_first_render",
    "firebase_init_finished",
    "login_screen_visible",
    "signup_started",
    "account_created",
    "onboarding_complete",
    "routine_generated",
  ] as const;

  const funnel: Array<{ step: string; devices: number; dropPct: number }> = [];
  let prevCount = uniqueInstalls;
  for (const step of funnelSteps) {
    const [row] = await db
      .select({
        count: sql<number>`count(distinct ${startupFunnelEventsTable.installId})::int`,
      })
      .from(startupFunnelEventsTable)
      .where(
        sql`${startupFunnelEventsTable.serverTs} >= ${since}
            AND ${startupFunnelEventsTable.eventName} = ${step}`,
      );
    const count = row?.count ?? 0;
    const dropPct = prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 1000) / 10 : 0;
    funnel.push({ step, devices: count, dropPct });
    prevCount = count;
  }

  const failureRows = await db
    .select({
      eventName: startupFunnelEventsTable.eventName,
      count: sql<number>`count(*)::int`,
    })
    .from(startupFunnelEventsTable)
    .where(
      sql`${startupFunnelEventsTable.serverTs} >= ${since}
          AND ${startupFunnelEventsTable.eventType} = 'failure'`,
    )
    .groupBy(startupFunnelEventsTable.eventName)
    .orderBy(sql`count(*) desc`)
    .limit(20);

  const slowDeviceRows = await db.execute<{
    manufacturer: string;
    device_model: string;
    p95_ms: number;
    count: number;
  }>(sql`
    SELECT
      COALESCE(manufacturer, 'unknown') AS manufacturer,
      COALESCE(device_model, 'unknown') AS device_model,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY elapsed_ms)::int AS p95_ms,
      count(*)::int AS count
    FROM startup_funnel_events
    WHERE server_ts >= ${since}
      AND event_name = 'login_screen_visible'
      AND elapsed_ms IS NOT NULL
    GROUP BY manufacturer, device_model
    HAVING count(*) >= 3
    ORDER BY p95_ms DESC
    LIMIT 20
  `);

  const failedDeviceRows = await db.execute<{
    manufacturer: string;
    device_model: string;
    failures: number;
    devices: number;
  }>(sql`
    SELECT
      COALESCE(manufacturer, 'unknown') AS manufacturer,
      COALESCE(device_model, 'unknown') AS device_model,
      count(*)::int AS failures,
      count(distinct device_id)::int AS devices
    FROM startup_funnel_events
    WHERE server_ts >= ${since}
      AND event_type = 'failure'
    GROUP BY manufacturer, device_model
    ORDER BY failures DESC
    LIMIT 20
  `);

  const routerReadyRate = await rateFor("router_ready");
  const loginReach = await rateFor("login_screen_visible");
  const signupReach = await rateFor("signup_screen_visible");
  const signupStarted = await rateFor("signup_started");
  const accountCreated = await rateFor("account_created");

  return {
    periodDays,
    sampleCount,
    uniqueDevices,
    uniqueInstalls,
    startupSuccessRate: Math.round(routerReadyRate * 1000) / 10,
    startupFailureRate: Math.round((await failureRate()) * 1000) / 10,
    blankScreenRate: Math.round((await rateFor("blank_screen_detected")) * 1000) / 10,
    whiteScreenRate: Math.round((await rateFor("white_screen_detected")) * 1000) / 10,
    timeoutRate: Math.round((await rateFor("startup_timeout")) * 1000) / 10,
    offlineLaunchRate: Math.round((await rateFor("offline_launch")) * 1000) / 10,
    cacheRecoveryRate: Math.round((await rateFor("cache_recovery")) * 1000) / 10,
    firebaseFailureRate: Math.round((await rateFor("firebase_failed")) * 1000) / 10,
    authFailureRate: Math.round((await rateFor("auth_failed")) * 1000) / 10,
    loginReachRate: Math.round(loginReach * 1000) / 10,
    signupReachRate: Math.round(signupReach * 1000) / 10,
    signupConversionRate: Math.round(signupStarted * 1000) / 10,
    accountCreationRate: Math.round(accountCreated * 1000) / 10,
    durations: {
      coldStartMs: await durationPercentiles("app_install_first_open", "login_screen_visible"),
      timeToReactMs: await durationPercentiles("react_bundle_started", "react_first_render"),
      timeToLoginMs: await durationPercentiles("app_install_first_open", "login_screen_visible"),
      timeToAppCoreMs: await durationPercentiles("appcore_started", "appcore_loaded"),
      firebaseWaitMs: await durationPercentiles("firebase_init_started", "firebase_init_finished"),
      authWaitMs: await durationPercentiles("auth_started", "auth_finished"),
    },
    funnel,
    topFailureEvents: failureRows.map((r) => ({
      eventName: r.eventName,
      count: r.count,
    })),
    topSlowDevices: (slowDeviceRows.rows ?? []).map((r) => ({
      manufacturer: r.manufacturer,
      deviceModel: r.device_model,
      p95Ms: Number(r.p95_ms),
      count: Number(r.count),
    })),
    topFailedDevices: (failedDeviceRows.rows ?? []).map((r) => ({
      manufacturer: r.manufacturer,
      deviceModel: r.device_model,
      failures: Number(r.failures),
      devices: Number(r.devices),
    })),
  };
}
