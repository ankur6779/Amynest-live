#!/usr/bin/env node
/**
 * Phase 5 activation funnel — reads production analytics_events (Postgres).
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/production-stabilization/analyze-activation-funnel.mjs
 *
 * Output: JSON funnel steps + docs/production-stabilization/phase-5/reports/funnel-snapshot.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const outDir = join(repoRoot, "docs/production-stabilization/phase-5/reports");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: DATABASE_URL });

async function eventFunnel() {
  const res = await client.query(`
    SELECT event_name,
           count(*)::int AS events,
           count(DISTINCT user_id)::int AS users
    FROM analytics_events
    WHERE event_name IN (
      'first_open', 'app_open', 'session_start', 'device_registered',
      'onboarding_milestone', 'onboarding_funnel_event',
      'routine_generated', 'routine_viewed', 'routine_item_completed',
      'premium_paywall_viewed', 'button_click', 'subscription_funnel_event',
      'feature_open', 'streak_updated', 'session_end'
    )
    GROUP BY 1
    ORDER BY users DESC, events DESC
  `);
  return res.rows;
}

async function onboardingSteps() {
  const res = await client.query(`
    SELECT props->>'step' AS step,
           count(*)::int AS events,
           count(DISTINCT user_id)::int AS users
    FROM analytics_events
    WHERE event_name = 'onboarding_funnel_event'
      AND props->>'step' IS NOT NULL
    GROUP BY 1
    ORDER BY users DESC
  `);
  return res.rows;
}

async function subscriptionSteps() {
  const res = await client.query(`
    SELECT props->>'step' AS step,
           count(*)::int AS events,
           count(DISTINCT user_id)::int AS users
    FROM analytics_events
    WHERE event_name = 'subscription_funnel_event'
      AND props->>'step' IS NOT NULL
    GROUP BY 1
    ORDER BY users DESC
  `);
  return res.rows;
}

async function retentionSnapshot() {
  const res = await client.query(`
    WITH first_seen AS (
      SELECT user_id, min(server_ts)::date AS cohort_day
      FROM analytics_events
      GROUP BY user_id
    ),
    activity AS (
      SELECT DISTINCT user_id, server_ts::date AS day
      FROM analytics_events
    )
    SELECT
      count(DISTINCT fs.user_id) FILTER (WHERE fs.cohort_day <= (now()::date - 1))::int AS mature_cohorts,
      count(DISTINCT a1.user_id)::int AS d1_retained,
      count(DISTINCT fs.user_id) FILTER (WHERE fs.cohort_day <= (now()::date - 1))::int AS d1_eligible,
      count(DISTINCT a7.user_id)::int AS d7_retained,
      count(DISTINCT fs.user_id) FILTER (WHERE fs.cohort_day <= (now()::date - 7))::int AS d7_eligible
    FROM first_seen fs
    LEFT JOIN activity a1 ON a1.user_id = fs.user_id AND a1.day = fs.cohort_day + 1
    LEFT JOIN activity a7 ON a7.user_id = fs.user_id AND a7.day = fs.cohort_day + 7
  `);
  const row = res.rows[0] ?? {};
  const d1Eligible = Number(row.d1_eligible ?? 0);
  const d7Eligible = Number(row.d7_eligible ?? 0);
  return {
    d1Rate: d1Eligible ? Number(row.d1_retained) / d1Eligible : null,
    d7Rate: d7Eligible ? Number(row.d7_retained) / d7Eligible : null,
    d1Retained: Number(row.d1_retained ?? 0),
    d7Retained: Number(row.d7_retained ?? 0),
    d1Eligible,
    d7Eligible,
  };
}

async function routineCompletion() {
  const res = await client.query(`
    SELECT
      count(DISTINCT user_id) FILTER (WHERE event_name = 'routine_generated')::int AS generated_users,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'routine_item_completed')::int AS completed_users,
      count(*) FILTER (WHERE event_name = 'routine_item_completed')::int AS completed_events
    FROM analytics_events
    WHERE event_name IN ('routine_generated', 'routine_item_completed')
  `);
  const row = res.rows[0] ?? {};
  const gen = Number(row.generated_users ?? 0);
  const comp = Number(row.completed_users ?? 0);
  return {
    generatedUsers: gen,
    completedUsers: comp,
    completionUserRate: gen ? comp / gen : null,
    completedEvents: Number(row.completed_events ?? 0),
  };
}

function buildFunnelSteps(events) {
  const byName = Object.fromEntries(events.map((r) => [r.event_name, r]));
  const step = (name) => ({
    event: name,
    users: byName[name]?.users ?? 0,
    events: byName[name]?.events ?? 0,
  });
  const opens = step("app_open").users || step("session_start").users;
  const registered = step("device_registered").users;
  const onboarded = step("onboarding_milestone").users;
  const generated = step("routine_generated").users;
  const paywall = step("premium_paywall_viewed").users;

  return [
    { stage: "first_open", ...step("first_open") },
    { stage: "app_open", users: opens, events: step("app_open").events },
    { stage: "device_registered", ...step("device_registered") },
    { stage: "onboarding_milestone", ...step("onboarding_milestone") },
    { stage: "routine_generated", ...step("routine_generated") },
    { stage: "premium_paywall_viewed", ...step("premium_paywall_viewed") },
    {
      stage: "conversion_rates",
      open_to_registered: opens ? registered / opens : null,
      registered_to_onboarded: registered ? onboarded / registered : null,
      registered_to_routine: registered ? generated / registered : null,
      routine_to_paywall: generated ? paywall / generated : null,
    },
  ];
}

async function main() {
  await client.connect();
  const [events, onboarding, subscription, retention, routine] = await Promise.all([
    eventFunnel(),
    onboardingSteps(),
    subscriptionSteps(),
    retentionSnapshot(),
    routineCompletion(),
  ]);
  await client.end();

  const report = {
    generatedAt: new Date().toISOString(),
    source: "analytics_events",
    funnel: buildFunnelSteps(events),
    events,
    onboardingSteps: onboarding,
    subscriptionSteps: subscription,
    retention,
    routineCompletion: routine,
  };

  await mkdir(outDir, { recursive: true });
  const outPath = join(outDir, "funnel-snapshot.json");
  await writeFile(outPath, JSON.stringify(report, null, 2));
  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(report.funnel, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
