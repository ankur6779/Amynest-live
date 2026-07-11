import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { ANALYTICS_NOISE_FILTER, rowNum } from "../growth-dashboard/sqlHelpers.js";
import type { DeployRegression } from "./types.js";
import { MIN_CHANGE_PCT, MIN_USERS, pctChange, validateEvidence } from "./safety.js";

const REGRESSION_THRESHOLD_PCT = 10;
const WINDOW_DAYS = 3;

type ReleaseInfo = { version: string; firstSeen: Date };

async function listRecentReleases(limit = 5): Promise<ReleaseInfo[]> {
  const res = await db.execute(sql`
    SELECT app_version, min(server_ts) AS first_seen
    FROM analytics_events
    WHERE app_version IS NOT NULL AND app_version != ''
      AND ${ANALYTICS_NOISE_FILTER}
      AND server_ts >= (now()::date - interval '60 days')
    GROUP BY app_version
    ORDER BY first_seen DESC
    LIMIT ${limit}
  `);
  return res.rows.map((row) => {
    const r = row as Record<string, unknown>;
    const ts = r.first_seen instanceof Date ? r.first_seen : new Date(String(r.first_seen));
    return { version: String(r.app_version), firstSeen: ts };
  });
}

async function countMetricUsers(
  release: ReleaseInfo,
  eventCondition: ReturnType<typeof sql>,
  before: boolean,
): Promise<number> {
  const anchor = release.firstSeen.toISOString();
  const res = await db.execute(sql`
    SELECT count(DISTINCT user_id)::int AS users
    FROM analytics_events
    WHERE ${eventCondition}
      AND app_version = ${release.version}
      AND ${ANALYTICS_NOISE_FILTER}
      AND server_ts >= (
        ${anchor}::timestamptz - ${before ? WINDOW_DAYS : 0} * interval '1 day'
      )
      AND server_ts < (
        ${anchor}::timestamptz + ${before ? 0 : WINDOW_DAYS} * interval '1 day'
      )
  `);
  return rowNum((res.rows[0] ?? {}) as Record<string, unknown>, "users");
}

const METRIC_CHECKS: Array<{
  metric: string;
  label: string;
  category: DeployRegression["category"];
  condition: ReturnType<typeof sql>;
}> = [
  {
    metric: "routine_completed",
    label: "Routine completion",
    category: "conversion",
    condition: sql`event_name IN ('routine_generated', 'routine_generation_completed')`,
  },
  {
    metric: "dashboard_view",
    label: "Dashboard reach",
    category: "conversion",
    condition: sql`event_name = 'dashboard_view' OR (event_name = 'screen_view' AND props->>'screen' = '/dashboard')`,
  },
  {
    metric: "trial_started",
    label: "Trial starts",
    category: "revenue",
    condition: sql`event_name = 'subscription_funnel_event' AND props->>'step' = 'trial_started'`,
  },
  {
    metric: "d1_proxy",
    label: "Day-1 return (proxy)",
    category: "retention",
    condition: sql`event_name = 'session_start'`,
  },
];

export async function detectDeployRegressions(): Promise<DeployRegression[]> {
  const releases = await listRecentReleases();
  const regressions: DeployRegression[] = [];

  for (const release of releases) {
    for (const check of METRIC_CHECKS) {
      const before = await countMetricUsers(release, check.condition, true);
      const after = await countMetricUsers(release, check.condition, false);
      const change = pctChange(after, before);
      const exceeds =
        change != null &&
        change < -REGRESSION_THRESHOLD_PCT &&
        before >= MIN_USERS &&
        after >= MIN_USERS / 2;

      if (!exceeds && (before < MIN_USERS || change == null)) continue;

      regressions.push({
        id: `reg_${release.version}_${check.metric}`,
        releaseVersion: release.version,
        releaseAt: release.firstSeen.toISOString(),
        metric: check.metric,
        label: check.label,
        beforeValue: before,
        afterValue: after,
        changePct: change,
        exceedsThreshold: exceeds,
        category: check.category,
        evidence: `app_version ${release.version}: ${before} users (${WINDOW_DAYS}d before) → ${after} users (${WINDOW_DAYS}d after first_seen)`,
        status: validateEvidence({
          verified: before >= MIN_USERS,
          users: before,
          confidence: exceeds ? 80 : 50,
          minUsers: MIN_USERS,
          minConfidence: exceeds ? 60 : 100,
        }),
      });
    }
  }

  return regressions
    .filter((r) => r.exceedsThreshold)
    .sort((a, b) => (a.changePct ?? 0) - (b.changePct ?? 0));
}

export { REGRESSION_THRESHOLD_PCT, MIN_CHANGE_PCT };
