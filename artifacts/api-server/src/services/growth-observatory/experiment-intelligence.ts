import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthTimeRange } from "../growth-dashboard/types.js";
import { ANALYTICS_NOISE_FILTER, pctRate, rowNum } from "../growth-dashboard/sqlHelpers.js";
import type { ExperimentIntel } from "./types.js";

const MIN_SAMPLE_PER_ARM = 30;

function zTestProportion(
  successesA: number,
  nA: number,
  successesB: number,
  nB: number,
): number | null {
  if (nA < MIN_SAMPLE_PER_ARM || nB < MIN_SAMPLE_PER_ARM) return null;
  const pA = successesA / nA;
  const pB = successesB / nB;
  const p = (successesA + successesB) / (nA + nB);
  const se = Math.sqrt(p * (1 - p) * (1 / nA + 1 / nB));
  if (se === 0) return null;
  const z = Math.abs(pA - pB) / se;
  if (z >= 2.58) return 99;
  if (z >= 1.96) return 95;
  if (z >= 1.65) return 90;
  return Math.min(89, Math.round(z * 40));
}

async function experimentFromVariant(
  id: string,
  name: string,
  featureFlag: string | null,
  primaryMetric: string,
  range: GrowthTimeRange,
): Promise<ExperimentIntel> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const res = await db.execute(sql`
    WITH users AS (
      SELECT DISTINCT
        user_id,
        coalesce(props->>'experiment_variant', 'control') AS variant
      FROM analytics_events
      WHERE server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        AND props ? 'experiment_variant'
        AND ${ANALYTICS_NOISE_FILTER}
    ),
    routine AS (
      SELECT DISTINCT user_id
      FROM analytics_events
      WHERE event_name IN ('routine_generated', 'routine_generation_completed', 'first_value_achieved')
        AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    ),
    finish AS (
      SELECT DISTINCT user_id
      FROM analytics_events
      WHERE (
        (event_name = 'onboarding_funnel_event' AND props->>'step' = 'finish_clicked')
        OR (event_name = 'onboarding_milestone' AND props->>'milestone' = 'completed')
      )
      AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    )
    SELECT
      u.variant,
      count(DISTINCT u.user_id)::int AS users,
      count(DISTINCT r.user_id)::int AS routines,
      count(DISTINCT f.user_id)::int AS finishes
    FROM users u
    LEFT JOIN routine r ON r.user_id = u.user_id
    LEFT JOIN finish f ON f.user_id = u.user_id
    GROUP BY u.variant
  `);

  let controlUsers = 0;
  let variantUsers = 0;
  let controlPrimary = 0;
  let variantPrimary = 0;
  let controlFinish = 0;
  let variantFinish = 0;

  for (const row of res.rows) {
    const r = row as Record<string, unknown>;
    const variant = String(r.variant);
    const users = rowNum(r, "users");
    const routines = rowNum(r, "routines");
    const finishes = rowNum(r, "finishes");
    if (variant === "control") {
      controlUsers = users;
      controlPrimary = primaryMetric === "onboarding_complete" ? finishes : routines;
      controlFinish = finishes;
    } else {
      variantUsers += users;
      variantPrimary += primaryMetric === "onboarding_complete" ? finishes : routines;
      variantFinish += finishes;
    }
  }

  const insufficient = controlUsers < MIN_SAMPLE_PER_ARM || variantUsers < MIN_SAMPLE_PER_ARM;
  const conf = zTestProportion(
    controlPrimary,
    controlUsers,
    variantPrimary,
    variantUsers,
  );

  let winning: ExperimentIntel["winningVariant"] = "inconclusive";
  if (!insufficient && conf != null && conf >= 90) {
    const rateC = controlUsers > 0 ? controlPrimary / controlUsers : 0;
    const rateV = variantUsers > 0 ? variantPrimary / variantUsers : 0;
    winning = rateV > rateC ? "variant" : rateV < rateC ? "control" : "inconclusive";
  }

  return {
    id,
    name,
    featureFlag,
    controlUsers,
    variantUsers,
    primaryMetric,
    primaryMetricControl: pctRate(controlPrimary, controlUsers),
    primaryMetricVariant: pctRate(variantPrimary, variantUsers),
    secondaryMetrics: [
      {
        key: "onboarding_complete",
        control: pctRate(controlFinish, controlUsers),
        variant: pctRate(variantFinish, variantUsers),
      },
    ],
    confidencePct: conf,
    winningVariant: insufficient ? null : winning,
    recommendedAction: insufficient
      ? "Continue collecting data — sample below minimum (30 per arm)."
      : winning === "variant"
        ? "Consider rolling variant to 100% if guardrails pass."
        : winning === "control"
          ? "Disable variant; control outperforms on primary metric."
          : "No winner yet — extend experiment duration.",
    insufficientSample: insufficient,
    verified: controlUsers + variantUsers > 0,
  };
}

async function firstValueSourceExperiment(range: GrowthTimeRange): Promise<ExperimentIntel | null> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();

  const res = await db.execute(sql`
    SELECT
      coalesce(props->>'source', 'unknown') AS source,
      count(DISTINCT user_id)::int AS cta_users,
      count(DISTINCT user_id) FILTER (
        WHERE user_id IN (
          SELECT user_id FROM analytics_events
          WHERE event_name IN ('routine_generated', 'routine_generation_completed')
            AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
        )
      )::int AS completed
    FROM analytics_events
    WHERE event_name = 'routine_cta_clicked'
      AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
    GROUP BY 1
    HAVING count(DISTINCT user_id) >= 5
    ORDER BY count(DISTINCT user_id) DESC
    LIMIT 2
  `);

  if (res.rows.length < 2) return null;

  const hero = res.rows.find((r) => String((r as Record<string, unknown>).source).includes("first_value"));
  const other = res.rows.find((r) => !String((r as Record<string, unknown>).source).includes("first_value"));
  if (!hero || !other) return null;

  const h = hero as Record<string, unknown>;
  const o = other as Record<string, unknown>;
  const nH = rowNum(h, "cta_users");
  const nO = rowNum(o, "cta_users");
  const sH = rowNum(h, "completed");
  const sO = rowNum(o, "completed");

  return {
    id: "exp_first_value_cta",
    name: "First Value Hero CTA vs Other CTAs",
    featureFlag: "VITE_FF_FIRST_VALUE_HERO",
    controlUsers: nO,
    variantUsers: nH,
    primaryMetric: "routine_completed_rate",
    primaryMetricControl: pctRate(sO, nO),
    primaryMetricVariant: pctRate(sH, nH),
    secondaryMetrics: [],
    confidencePct: zTestProportion(sO, nO, sH, nH),
    winningVariant:
      nH >= MIN_SAMPLE_PER_ARM && nO >= MIN_SAMPLE_PER_ARM
        ? pctRate(sH, nH)! > pctRate(sO, nO)!
          ? "variant"
          : "control"
        : null,
    recommendedAction: "Compare hero CTA conversion vs legacy dashboard CTAs.",
    insufficientSample: nH < MIN_SAMPLE_PER_ARM || nO < MIN_SAMPLE_PER_ARM,
    verified: true,
  };
}

export async function computeExperimentIntelligence(
  range: GrowthTimeRange,
): Promise<ExperimentIntel[]> {
  const experiments = await Promise.all([
    experimentFromVariant(
      "exp_onboarding_short_branch",
      "Onboarding Short Child Branch",
      "VITE_FF_ONBOARDING_SHORT_CHILD_BRANCH",
      "routine_completed",
      range,
    ),
    firstValueSourceExperiment(range),
  ]);

  return experiments.filter((e): e is ExperimentIntel => e != null);
}
