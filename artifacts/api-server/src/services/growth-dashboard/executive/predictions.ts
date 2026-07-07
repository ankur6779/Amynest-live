import type { GrowthDashboardPayload, PredictionHorizon, Predictions } from "../types.js";

function projectValue(current: number | null, changePct: number | null, days: number): number | null {
  if (current == null) return null;
  const dailyRate = changePct != null ? changePct / 100 / 30 : 0;
  return Math.max(0, Math.round(current * (1 + dailyRate * days)));
}

export function computePredictions(input: {
  kpis: GrowthDashboardPayload["kpis"];
  subscriptions: GrowthDashboardPayload["subscriptions"];
  charts: GrowthDashboardPayload["charts"];
}): Predictions {
  const mrr = input.subscriptions.mrr;
  const mrrChange = input.kpis.mrr?.changePct ?? null;
  const installCurrent = input.kpis.downloads?.value ?? null;
  const installChange = input.kpis.downloads?.changePct ?? null;
  const subCurrent = input.kpis.paidSubscribers?.value ?? null;
  const subChange = input.kpis.paidSubscribers?.changePct ?? null;
  const revenueCurrent = input.kpis.subscriptionRevenue?.value ?? null;
  const revenueChange = input.kpis.subscriptionRevenue?.changePct ?? null;

  const horizons: PredictionHorizon[] = [7, 30, 90].map((days) => {
    const estMrr = projectValue(mrr, mrrChange, days);
    return {
      days,
      estimatedMrr: estMrr,
      estimatedArr: estMrr != null ? estMrr * 12 : null,
      estimatedInstalls: projectValue(installCurrent, installChange, days),
      estimatedSubscriptions: projectValue(subCurrent, subChange, days),
      estimatedRevenue: projectValue(revenueCurrent, revenueChange, days),
    };
  });

  return {
    label: "Trend projection from current period momentum (estimated, not forecast model)",
    horizons,
  };
}
