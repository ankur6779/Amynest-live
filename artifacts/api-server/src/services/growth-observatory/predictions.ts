import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type { PredictionWithCI } from "./types.js";

const MIN_SAMPLE = 14;

function momentumForecast(
  current: number | null,
  changePct: number | null,
  days: number,
  momentumWindow: number,
): number | null {
  if (current == null) return null;
  const dailyRate = changePct != null ? changePct / 100 / momentumWindow : 0;
  return Math.max(0, Math.round(current * (1 + dailyRate * days)));
}

function ciBand(point: number | null, confidencePct: number | null): { low: number | null; high: number | null } {
  if (point == null) return { low: null, high: null };
  const spread = confidencePct != null && confidencePct >= 80 ? 0.15 : confidencePct != null && confidencePct >= 60 ? 0.25 : 0.4;
  return {
    low: Math.round(point * (1 - spread)),
    high: Math.round(point * (1 + spread)),
  };
}

export async function computePurchaseFailureRate(range: { start: Date; end: Date }): Promise<number | null> {
  const start = range.start.toISOString();
  const end = range.end.toISOString();
  const res = await db.execute(sql`
    SELECT
      count(*) FILTER (WHERE props->>'step' = 'purchase_success')::int AS success,
      count(*) FILTER (WHERE props->>'step' = 'purchase_failed')::int AS failed
    FROM analytics_events
    WHERE event_name = 'subscription_funnel_event'
      AND server_ts >= ${start}::timestamptz AND server_ts <= ${end}::timestamptz
  `);
  const r = (res.rows[0] ?? {}) as Record<string, unknown>;
  const success = Number(r.success ?? 0);
  const failed = Number(r.failed ?? 0);
  const total = success + failed;
  if (total === 0) return null;
  return Math.round((failed / total) * 1000) / 10;
}

export function computeObservatoryPredictions(input: {
  dashboard: GrowthDashboardPayload;
  dauSeriesDays: number;
  momentumDays?: number;
}): PredictionWithCI[] {
  const momentum = input.momentumDays ?? 7;
  const sample = input.dauSeriesDays;
  const lowConfidence = sample < MIN_SAMPLE;

  const metrics: Array<{
    metric: string;
    current: number | null;
    changePct: number | null;
    horizons: number[];
  }> = [
    { metric: "installs", current: input.dashboard.kpis.downloads?.value ?? null, changePct: input.dashboard.kpis.downloads?.changePct ?? null, horizons: [30] },
    { metric: "dau", current: input.dashboard.kpis.dau?.value ?? null, changePct: input.dashboard.kpis.dau?.changePct ?? null, horizons: [30] },
    { metric: "mrr", current: input.dashboard.subscriptions.mrr, changePct: input.dashboard.kpis.mrr?.changePct ?? null, horizons: [30] },
    { metric: "paid_subscribers", current: input.dashboard.subscriptions.paidUsers, changePct: input.dashboard.kpis.paidSubscribers?.changePct ?? null, horizons: [30] },
    { metric: "trial_starts", current: input.dashboard.kpis.trialsStarted?.value ?? null, changePct: input.dashboard.kpis.trialsStarted?.changePct ?? null, horizons: [30] },
    { metric: "routine_usage", current: input.dashboard.charts.routineGenerated.at(-1)?.value ?? null, changePct: null, horizons: [30] },
  ];

  const predictions: PredictionWithCI[] = [];

  for (const m of metrics) {
    for (const horizon of m.horizons) {
      if (lowConfidence || m.current == null) {
        predictions.push({
          metric: m.metric,
          horizonDays: horizon,
          pointEstimate: null,
          low: null,
          high: null,
          confidencePct: null,
          status: "not_enough_data",
          method: `Requires ≥${MIN_SAMPLE} days of history (have ${sample})`,
        });
        continue;
      }

      const conf = Math.min(85, 45 + Math.min(sample, 30));
      const point = momentumForecast(m.current, m.changePct, horizon, momentum);
      const band = ciBand(point, conf);
      predictions.push({
        metric: m.metric,
        horizonDays: horizon,
        pointEstimate: point,
        low: band.low,
        high: band.high,
        confidencePct: conf,
        status: "ok",
        method: "Linear momentum extrapolation — not a trained ML model",
      });
    }
  }

  const churnEstimate = input.dashboard.kpis.churn?.value ?? null;
  predictions.push({
    metric: "expected_churn",
    horizonDays: 30,
    pointEstimate: churnEstimate,
    low: churnEstimate != null ? Math.max(0, churnEstimate - 2) : null,
    high: churnEstimate != null ? churnEstimate + 3 : null,
    confidencePct: churnEstimate != null && sample >= MIN_SAMPLE ? 55 : null,
    status: sample >= MIN_SAMPLE && churnEstimate != null ? "ok" : "not_enough_data",
    method: "Observed churn events in window",
  });

  return predictions;
}
