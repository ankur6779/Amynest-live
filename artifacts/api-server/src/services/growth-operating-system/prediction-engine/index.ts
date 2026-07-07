import type { GrowthDashboardPayload } from "../../growth-dashboard/types.js";
import type { GrowthOsSettings } from "../types.js";

export type PredictionV2Horizon = {
  days: number;
  confidencePct: number;
  revenue: number | null;
  mrr: number | null;
  arr: number | null;
  trials: number | null;
  subscriptions: number | null;
  retentionD7: number | null;
  installs: number | null;
};

export function computePredictionsV2(input: {
  kpis: GrowthDashboardPayload["kpis"];
  subscriptions: GrowthDashboardPayload["subscriptions"];
  retention: GrowthDashboardPayload["retention"];
  settings: GrowthOsSettings;
}): { label: string; horizons: PredictionV2Horizon[] } {
  const momentum = input.settings.predictionMomentumDays;

  function project(current: number | null, changePct: number | null, days: number): number | null {
    if (current == null) return null;
    const dailyRate = changePct != null ? changePct / 100 / momentum : 0;
    return Math.max(0, Math.round(current * (1 + dailyRate * days)));
  }

  function confidence(changePct: number | null, sample: number): number {
    let c = 55;
    if (sample > 50) c += 15;
    if (changePct != null && Math.abs(changePct) < 25) c += 10;
    if (input.retention.summary.d7 != null && input.retention.summary.d7 > 8) c += 10;
    return Math.min(92, c);
  }

  const sample = input.kpis.dau?.value ?? 0;
  const horizons: PredictionV2Horizon[] = [7, 30, 90].map((days) => {
    const changeMrr = input.kpis.mrr?.changePct ?? null;
    const estMrr = project(input.subscriptions.mrr, changeMrr, days);
    return {
      days,
      confidencePct: confidence(changeMrr, sample),
      mrr: estMrr,
      arr: estMrr != null ? estMrr * 12 : null,
      revenue: project(
        input.kpis.subscriptionRevenue?.value ?? null,
        input.kpis.subscriptionRevenue?.changePct ?? null,
        days,
      ),
      trials: project(
        input.kpis.trialsStarted?.value ?? null,
        input.kpis.trialsStarted?.changePct ?? null,
        days,
      ),
      subscriptions: project(
        input.kpis.paidSubscribers?.value ?? null,
        input.kpis.paidSubscribers?.changePct ?? null,
        days,
      ),
      retentionD7: input.retention.summary.d7,
      installs: project(
        input.kpis.downloads?.value ?? null,
        input.kpis.downloads?.changePct ?? null,
        days,
      ),
    };
  });

  return {
    label: "Estimated projections from period momentum — not a trained forecast model",
    horizons,
  };
}
