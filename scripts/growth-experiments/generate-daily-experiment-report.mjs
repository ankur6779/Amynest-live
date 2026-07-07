#!/usr/bin/env node
/**
 * Daily growth experiment report — production Postgres only.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/growth-experiments/generate-daily-experiment-report.mjs
 *   DATABASE_URL=... node scripts/growth-experiments/generate-daily-experiment-report.mjs --date 2026-07-07
 *   DATABASE_URL=... node scripts/growth-experiments/generate-daily-experiment-report.mjs --phase value_bridge
 *
 * Env (optional overrides for active flags during rollout):
 *   EXPERIMENT_VALUE_BRIDGE_ENABLED=true|false
 *   EXPERIMENT_DASHBOARD_PRIORITY_ENABLED=true|false
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");
const outDir = join(repoRoot, "docs/product-growth/experiments/daily");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const args = process.argv.slice(2);
const dateIdx = args.indexOf("--date");
const reportDate =
  dateIdx >= 0 && args[dateIdx + 1]
    ? args[dateIdx + 1]
    : new Date().toISOString().slice(0, 10);
const phaseIdx = args.indexOf("--phase");
const activePhase =
  phaseIdx >= 0 && args[phaseIdx + 1] ? args[phaseIdx + 1] : "baseline";

const valueBridgeFlag =
  process.env.EXPERIMENT_VALUE_BRIDGE_ENABLED ?? "false";
const dashboardFlag =
  process.env.EXPERIMENT_DASHBOARD_PRIORITY_ENABLED ?? "false";

const client = new pg.Client({ connectionString: DATABASE_URL });

async function q(sql, params = []) {
  const res = await client.query(sql, params);
  return res.rows;
}

function pct(num, den) {
  if (!den) return null;
  return Math.round((num / den) * 1000) / 10;
}

function rateLabel(n) {
  return n == null ? "—" : `${n}%`;
}

async function retentionRates() {
  const [row] = await q(`
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
      count(DISTINCT fs.user_id) FILTER (WHERE fs.cohort_day <= ($1::date - 1))::int AS d1_eligible,
      count(DISTINCT a1.user_id)::int AS d1_retained,
      count(DISTINCT fs.user_id) FILTER (WHERE fs.cohort_day <= ($1::date - 7))::int AS d7_eligible,
      count(DISTINCT a7.user_id)::int AS d7_retained
    FROM first_seen fs
    LEFT JOIN activity a1 ON a1.user_id = fs.user_id AND a1.day = fs.cohort_day + 1
    LEFT JOIN activity a7 ON a7.user_id = fs.user_id AND a7.day = fs.cohort_day + 7
  `, [reportDate]);
  return {
    d1: pct(Number(row.d1_retained), Number(row.d1_eligible)),
    d7: pct(Number(row.d7_retained), Number(row.d7_eligible)),
    d1Retained: Number(row.d1_retained ?? 0),
    d7Retained: Number(row.d7_retained ?? 0),
    d1Eligible: Number(row.d1_eligible ?? 0),
    d7Eligible: Number(row.d7_eligible ?? 0),
  };
}

async function dayWindow() {
  return q(
    `
    SELECT
      count(DISTINCT user_id) FILTER (WHERE event_name = 'screen_view' AND props->>'path' = '/dashboard')::int AS dashboard_viewers,
      count(*) FILTER (WHERE event_name = 'screen_view' AND props->>'path' = '/dashboard')::int AS dashboard_views,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'routine_generated')::int AS routine_generated_users,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'routine_item_completed')::int AS routine_completed_users,
      count(*) FILTER (WHERE event_name = 'routine_item_completed')::int AS routine_completed_events,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'weekly_summary_viewed')::int AS weekly_summary_users,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'daily_checkin')::int AS daily_checkin_users,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'resume_clicked')::int AS resume_click_users,
      count(DISTINCT user_id) FILTER (WHERE event_name = 'error_captured')::int AS crash_users,
      count(*) FILTER (WHERE event_name = 'error_captured')::int AS crash_events,
      count(DISTINCT user_id)::int AS dau
    FROM analytics_events
    WHERE server_ts >= $1::date AND server_ts < ($1::date + interval '1 day')
  `,
    [reportDate],
  );
}

async function valueBridgeFunnel() {
  const rows = await q(
    `
    SELECT
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_eligible'
      )::int AS eligible_users,
      count(*) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_eligible'
      )::int AS eligible_events,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_shown'
      )::int AS shown_users,
      count(*) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_shown'
      )::int AS shown_events,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_clicked'
      )::int AS clicked_users,
      count(*) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_clicked'
      )::int AS clicked_events,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_dismissed'
      )::int AS dismissed_users,
      count(*) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_dismissed'
      )::int AS dismissed_events,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_suppressed'
      )::int AS suppressed_users,
      count(*) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'value_bridge_suppressed'
      )::int AS suppressed_events,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'subscription_funnel_event'
          AND props->>'step' = 'checkout_started'
          AND props->>'source' IN ('value_bridge', 'routine_completion', 'weekly_summary')
      )::int AS checkout_users,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'subscription_funnel_event' AND props->>'step' = 'purchase_success'
      )::int AS purchase_users
    FROM analytics_events
    WHERE server_ts >= $1::date AND server_ts < ($1::date + interval '1 day')
  `,
    [reportDate],
  );
  const r = rows[0] ?? {};
  const eligible = Number(r.eligible_users ?? 0);
  const shown = Number(r.shown_users ?? 0);
  const clicked = Number(r.clicked_users ?? 0);
  const dismissed = Number(r.dismissed_users ?? 0);
  const suppressed = Number(r.suppressed_users ?? 0);
  return {
    eligibleUsers: eligible,
    eligibleEvents: Number(r.eligible_events ?? 0),
    shownUsers: shown,
    shownEvents: Number(r.shown_events ?? 0),
    shownRate: pct(shown, eligible),
    suppressedUsers: suppressed,
    suppressedEvents: Number(r.suppressed_events ?? 0),
    clickedUsers: clicked,
    dismissedUsers: dismissed,
    ctr: pct(clicked, shown),
    dismissRate: pct(dismissed, shown),
    checkoutUsers: Number(r.checkout_users ?? 0),
    checkoutRate: pct(Number(r.checkout_users ?? 0), shown),
    purchaseUsers: Number(r.purchase_users ?? 0),
    purchaseRate: pct(Number(r.purchase_users ?? 0), Number(r.checkout_users ?? 0)),
  };
}

async function valueBridgeSuppressionBreakdown() {
  return q(
    `
    SELECT
      coalesce(props->>'reason', 'unknown') AS reason,
      props->>'step' AS step,
      count(DISTINCT user_id)::int AS users,
      count(*)::int AS events
    FROM analytics_events
    WHERE event_name = 'subscription_funnel_event'
      AND server_ts >= $1::date AND server_ts < ($1::date + interval '1 day')
      AND props->>'step' IN ('value_bridge_not_shown', 'value_bridge_suppressed')
    GROUP BY 1, 2
    ORDER BY users DESC, events DESC
  `,
    [reportDate],
  );
}

function suppressionTargets(breakdown) {
  const byReason = {};
  for (const row of breakdown) {
    const reason = row.reason;
    byReason[reason] = (byReason[reason] ?? 0) + Number(row.users ?? 0);
  }
  return {
    feature_flag_off: byReason.feature_flag_off ?? 0,
    missing_value_moment: byReason.missing_value_moment ?? 0,
    already_seen_today: byReason.already_seen_today ?? 0,
    byReason,
  };
}

function valueBridgeHealthCheck(vb, suppression) {
  const targets = suppressionTargets(suppression);
  const checks = [
    {
      name: "shown_rate > 90%",
      pass: vb.shownRate != null && vb.shownRate > 90,
      actual: rateLabel(vb.shownRate),
    },
    {
      name: "feature_flag_off = 0",
      pass: targets.feature_flag_off === 0,
      actual: String(targets.feature_flag_off),
    },
    {
      name: "missing_value_moment = 0",
      pass: targets.missing_value_moment === 0,
      actual: String(targets.missing_value_moment),
    },
    {
      name: "already_seen_today reasonable",
      pass:
        vb.eligibleUsers === 0 ||
        (targets.already_seen_today / vb.eligibleUsers) <= 0.5,
      actual: `${targets.already_seen_today} users`,
    },
  ];
  return { targets, checks, allPass: checks.every((c) => c.pass) };
}

async function dashboardFunnel() {
  const [nav] = await q(
    `
    SELECT
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'navigation' AND props->>'from_route' = '/dashboard'
          AND props->>'to_route' LIKE '/routines%'
      )::int AS to_routine,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'navigation' AND props->>'from_route' = '/dashboard'
          AND props->>'to_route' = '/parenting-hub'
      )::int AS to_hub,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'weekly_summary_viewed'
      )::int AS weekly_summary,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'screen_view' AND props->>'path' = '/dashboard'
      )::int AS dashboard_viewers,
      count(DISTINCT user_id) FILTER (
        WHERE event_name = 'screen_leave' AND props->>'path' = '/dashboard'
      )::int AS dashboard_leavers
    FROM analytics_events
    WHERE server_ts >= $1::date AND server_ts < ($1::date + interval '1 day')
  `,
    [reportDate],
  );
  const viewers = Number(nav.dashboard_viewers ?? 0);
  return {
    viewers,
    toRoutineUsers: Number(nav.to_routine ?? 0),
    toHubUsers: Number(nav.to_hub ?? 0),
    weeklySummaryUsers: Number(nav.weekly_summary ?? 0),
    dashboardLeavers: Number(nav.dashboard_leavers ?? 0),
    routineCtr: pct(Number(nav.to_routine ?? 0), viewers),
    hubCtr: pct(Number(nav.to_hub ?? 0), viewers),
    weeklySummaryCtr: pct(Number(nav.weekly_summary ?? 0), viewers),
    exitRate: pct(Number(nav.dashboard_leavers ?? 0), viewers),
  };
}

async function checkoutFunnel() {
  const rows = await q(
    `
    SELECT
      props->>'step' AS step,
      props->>'source' AS source,
      count(DISTINCT user_id)::int AS users,
      count(*)::int AS events
    FROM analytics_events
    WHERE event_name = 'subscription_funnel_event'
      AND server_ts >= $1::date AND server_ts < ($1::date + interval '1 day')
      AND props->>'step' IN (
        'plan_card_viewed', 'checkout_started', 'purchase_success', 'paywall_opened'
      )
    GROUP BY 1, 2
    ORDER BY users DESC
  `,
    [reportDate],
  );
  return rows;
}

function recommend(report, phase) {
  const vb = report.valueBridge;
  const dash = report.dashboard;
  const day = report.day;

  if (phase === "value_bridge" || activePhase === "value_bridge") {
    const routineRate = pct(
      Number(day.routine_completed_users),
      Number(day.routine_generated_users),
    );
    const baselineRoutine = report.baselines?.routineCompletionRate;
    if (day.crash_users > (report.baselines?.crashUsers ?? 0) * 1.25) {
      return { action: "ROLLBACK", reason: "Crash users elevated vs baseline" };
    }
    if (
      baselineRoutine != null &&
      routineRate != null &&
      routineRate < baselineRoutine - 5
    ) {
      return { action: "ROLLBACK", reason: "Routine completion rate dropped >5pp" };
    }
    if (vb.shownUsers === 0 && phase === "value_bridge") {
      return { action: "WATCH", reason: "Flag on but zero value_bridge_shown — verify deploy" };
    }
    if (vb.eligibleUsers > 0 && vb.shownRate != null && vb.shownRate < 90) {
      return {
        action: "WATCH",
        reason: `shown_rate ${vb.shownRate}% below 90% target — check suppression breakdown`,
      };
    }
    if (report.valueBridgeHealth?.targets?.feature_flag_off > 0) {
      return {
        action: "ROLLBACK",
        reason: "feature_flag_off suppressions detected while flag should be ON",
      };
    }
    if (report.valueBridgeHealth?.targets?.missing_value_moment > 0) {
      return {
        action: "WATCH",
        reason: "missing_value_moment > 0 — invalid trigger wiring",
      };
    }
    if (vb.checkoutUsers > 0 || vb.ctr > 0) {
      return { action: "WATCH", reason: "Early signal — continue 72h collection" };
    }
    return { action: "WATCH", reason: "Collecting Phase 1 data" };
  }

  if (phase === "dashboard_priority" || activePhase === "dashboard_priority") {
    const baselineRoutineCtr = report.baselines?.dashboardRoutineCtr;
    if (
      baselineRoutineCtr != null &&
      dash.routineCtr != null &&
      dash.routineCtr < baselineRoutineCtr - 3
    ) {
      return { action: "ROLLBACK", reason: "Dashboard→Routine CTR regressed" };
    }
    if (
      dash.routineCtr != null &&
      baselineRoutineCtr != null &&
      dash.routineCtr > baselineRoutineCtr
    ) {
      return { action: "SCALE", reason: "Dashboard→Routine CTR improved" };
    }
    return { action: "WATCH", reason: "Collecting Phase 2 data" };
  }

  return { action: "WATCH", reason: "Baseline — enable Phase 1 when ready" };
}

function markdown(report) {
  const r = report.recommendation;
  return `# Growth Experiment Daily Report — ${reportDate}

**Phase:** ${report.activePhase}  
**Generated:** ${report.generatedAt}  
**Data source:** Production Postgres (\`analytics_events\`)

---

## 1. Active Feature Flags

| Flag | Configured state |
|------|------------------|
| \`VITE_FF_VALUE_BRIDGE_INVITES\` | **${report.flags.valueBridge}** |
| \`VITE_FF_DASHBOARD_PRIORITY_ORDER\` | **${report.flags.dashboardPriority}** |

**Rule:** Never enable both simultaneously during experiment windows.

---

## 2. Revenue Funnel (day)

| Metric | Users |
|--------|-------|
| DAU | ${report.day.dau} |
| Checkout started | ${report.checkout.filter((c) => c.step === "checkout_started").reduce((s, c) => s + c.users, 0)} |
| Purchase success | ${report.checkout.filter((c) => c.step === "purchase_success").reduce((s, c) => s + c.users, 0)} |

---

## 3. Dashboard Funnel

| Metric | Value |
|--------|-------|
| Dashboard viewers | ${report.dashboard.viewers} |
| Dashboard → Routine CTR | ${rateLabel(report.dashboard.routineCtr)} |
| Dashboard → Parent Hub CTR | ${rateLabel(report.dashboard.hubCtr)} |
| Dashboard → Weekly Summary CTR | ${rateLabel(report.dashboard.weeklySummaryCtr)} |
| Dashboard exit rate | ${rateLabel(report.dashboard.exitRate)} |
| Resume clicks | ${report.day.resume_click_users} |

---

## 4. Value Bridge Funnel

| Metric | Value |
|--------|-------|
| Eligible users | ${report.valueBridge.eligibleUsers} |
| Shown users | ${report.valueBridge.shownUsers} |
| **Shown rate** | **${rateLabel(report.valueBridge.shownRate)}** (target >90%) |
| Suppressed users | ${report.valueBridge.suppressedUsers} |
| Clicked (users) | ${report.valueBridge.clickedUsers} |
| CTR | ${rateLabel(report.valueBridge.ctr)} |
| Dismissed (users) | ${report.valueBridge.dismissedUsers} |
| Dismiss rate | ${rateLabel(report.valueBridge.dismissRate)} |
| Checkout from bridge | ${report.valueBridge.checkoutUsers} |
| Checkout rate | ${rateLabel(report.valueBridge.checkoutRate)} |

### Suppression reason breakdown

| Reason | Step | Users | Events |
|--------|------|-------|--------|
${report.valueBridgeSuppression.length ? report.valueBridgeSuppression.map((s) => `| \`${s.reason}\` | \`${s.step}\` | ${s.users} | ${s.events} |`).join("\n") : "| — | — | 0 | 0 |"}

### Health targets

| Target | Pass | Actual |
|--------|------|--------|
${report.valueBridgeHealth.checks.map((c) => `| ${c.name} | ${c.pass ? "✅" : "❌"} | ${c.actual} |`).join("\n")}

---

## 5. Checkout Funnel (by source)

${report.checkout.length ? report.checkout.map((c) => `- \`${c.step}\` / \`${c.source ?? "—"}\`: **${c.users}** users (${c.events} events)`).join("\n") : "- No checkout events"}

---

## 6. Purchase Funnel

| Purchases | ${report.valueBridge.purchaseUsers} |
| Purchase rate (of checkout) | ${rateLabel(report.valueBridge.purchaseRate)} |

---

## 7. Crash Summary

| Crash users | ${report.day.crash_users} |
| Crash events | ${report.day.crash_events} |

---

## 8. D1 Retention

| Metric | Rate | Retained / Eligible |
|--------|------|---------------------|
| D1 | ${rateLabel(report.retention.d1)} | ${report.retention.d1Retained} / ${report.retention.d1Eligible} |

---

## 9. D7 Retention

| Metric | Rate | Retained / Eligible |
|--------|------|---------------------|
| D7 | ${rateLabel(report.retention.d7)} | ${report.retention.d7Retained} / ${report.retention.d7Eligible} |

---

## 10. Routine Health

| Metric | Value |
|--------|-------|
| Routine generated (users) | ${report.day.routine_generated_users} |
| Routine completed (users) | ${report.day.routine_completed_users} |
| Completion rate | ${rateLabel(report.routineCompletionRate)} |
| Daily check-in (users) | ${report.day.daily_checkin_users} |

---

## Recommendation: **${r.action}**

${r.reason}

---

*Generated by \`scripts/growth-experiments/generate-daily-experiment-report.mjs\`*
`;
}

async function main() {
  await client.connect();
  const [dayRows, valueBridge, valueBridgeSuppression, dashboard, checkout, retention] =
    await Promise.all([
      dayWindow(),
      valueBridgeFunnel(),
      valueBridgeSuppressionBreakdown(),
      dashboardFunnel(),
      checkoutFunnel(),
      retentionRates(),
    ]);
  await client.end();

  const day = dayRows[0] ?? {};
  const routineCompletionRate = pct(
    Number(day.routine_completed_users),
    Number(day.routine_generated_users),
  );
  const valueBridgeHealth = valueBridgeHealthCheck(valueBridge, valueBridgeSuppression);

  const report = {
    generatedAt: new Date().toISOString(),
    reportDate,
    activePhase,
    flags: {
      valueBridge: valueBridgeFlag,
      dashboardPriority: dashboardFlag,
    },
    day,
    routineCompletionRate,
    valueBridge,
    valueBridgeSuppression,
    valueBridgeHealth,
    dashboard,
    checkout,
    retention,
    baselines: {
      routineCompletionRate,
      crashUsers: Number(day.crash_users ?? 0),
      dashboardRoutineCtr: dashboard.routineCtr,
    },
  };
  report.recommendation = recommend(report, activePhase);

  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, `${reportDate}.json`);
  const mdPath = join(outDir, `${reportDate}.md`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2));
  await writeFile(mdPath, markdown(report));
  console.log(`Wrote ${mdPath}`);
  console.log(`Recommendation: ${report.recommendation.action} — ${report.recommendation.reason}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
