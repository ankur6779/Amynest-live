import type { GrowthDashboardPayload } from "../growth-dashboard/types.js";
import type {
  ChurnRiskUser,
  FeatureRevenueAttribution,
  FinancialMetric,
  FounderFinanceBrief,
  PricingExperimentAttribution,
  SubscriptionFunnelStage,
} from "./types.js";
import type { EvidenceClass } from "./types.js";

export function buildFounderFinanceBrief(input: {
  dashboard: GrowthDashboardPayload;
  financialKpis: FinancialMetric[];
  funnel: SubscriptionFunnelStage[];
  featureAttribution: FeatureRevenueAttribution[];
  churn: { renewalRisk: ChurnRiskUser[]; subscribersAtRisk: ChurnRiskUser[] };
  experiments: PricingExperimentAttribution[];
  mrrHistoryDays?: number;
  date?: string;
}): FounderFinanceBrief {
  const date = input.date ?? new Date().toISOString().slice(0, 10);
  const mrr = input.financialKpis.find((k) => k.key === "mrr");
  const paid = input.dashboard.subscriptions.paidUsers;
  const trials = input.dashboard.subscriptions.trialUsers;

  const revenueSummary =
    paid > 0
      ? `MRR ₹${mrr?.value ?? 0} (${mrr?.evidenceClass ?? "estimated"}). ${paid} paid, ${trials} trial, ${input.dashboard.subscriptions.expiredUsers} expired.`
      : trials > 0
        ? `${trials} trial users, 0 paid — revenue blocked at purchase.`
        : "NOT ENOUGH EVIDENCE — no paid subscribers in production.";

  const mrrChange = mrr?.changePct;
  const mrrTrend =
    mrrChange != null && mrrChange !== 0
      ? `MRR ${mrrChange > 0 ? "+" : ""}${mrrChange}% vs prior period (${mrr?.evidenceClass}).`
      : `MRR stable at ₹${mrr?.value ?? 0} — catalog-based estimate, not cash ledger.`;

  const topDrivers = input.featureAttribution
    .filter((f) => f.purchaseCorrelationPct != null && f.purchaseCorrelationPct > 0)
    .slice(0, 3)
    .map((f) => `${f.label}: ${f.purchaseCorrelationPct}% of purchasers used before buy (correlation)`);

  if (topDrivers.length === 0) {
    topDrivers.push("NOT ENOUGH EVIDENCE — insufficient purchase events for feature attribution");
  }

  const topRisks: string[] = [];
  for (const r of input.churn.subscribersAtRisk) {
    if (r.status !== "not_verified") topRisks.push(`${r.segment}: ${r.users} users (risk ${r.riskScore})`);
  }
  for (const r of input.churn.renewalRisk) {
    if (r.status !== "not_verified") topRisks.push(`${r.segment}: ${r.users} users`);
  }
  const failed = input.financialKpis.find((k) => k.key === "failed_purchases");
  if ((failed?.value ?? 0) > 0) topRisks.push(`${failed!.value} failed purchases in window`);
  if (topRisks.length === 0) topRisks.push("No elevated churn/payment risks detected");

  const renewals = input.dashboard.kpis.renewals?.value ?? 0;
  const expectedRenewals =
    renewals > 0
      ? `${renewals} renewal events in window (heuristic from last_event_type).`
      : paid > 0
        ? `${paid} active subs — renewal events not separately instrumented.`
        : "NOT ENOUGH EVIDENCE";

  const churnCount = input.dashboard.kpis.churn?.value ?? 0;
  const expectedChurn =
    churnCount > 0
      ? `${churnCount} CANCELLED/EXPIRED transitions in window.`
      : "No churn transitions in window — sample may be insufficient.";

  const actions: string[] = [];
  if (trials > 0 && paid === 0) {
    actions.push("P0: Unblock trial → paid — 0% conversion with active trials");
  }
  if ((failed?.value ?? 0) >= 3) {
    actions.push(`Investigate purchase_failed (${failed!.value} events) — payment or store issue`);
  }
  const shipExp = input.experiments.find((e) => e.decision === "ship");
  if (shipExp) actions.push(`Ship experiment: ${shipExp.name} (${shipExp.confidencePct}% confidence)`);
  const topFeature = input.featureAttribution[0];
  if (topFeature && (topFeature.purchaseCorrelationPct ?? 0) > 30) {
    actions.push(`Double down on ${topFeature.label} in paywall/value messaging (correlation ${topFeature.purchaseCorrelationPct}%)`);
  }
  if (actions.length === 0) actions.push("Monitor subscription funnel — no high-confidence revenue actions today");

  const historyDays = input.mrrHistoryDays ?? 0;
  let projectedStatus: EvidenceClass = "not_verified";
  let projected: number | null = null;
  let low: number | null = null;
  let high: number | null = null;
  if (historyDays >= 14 && (mrr?.value ?? 0) > 0) {
    projected = mrr!.value!;
    low = Math.round(projected * 0.85);
    high = Math.round(projected * 1.15);
    projectedStatus = "estimated";
  }

  return {
    date,
    revenueSummary,
    mrrTrend,
    topRevenueDrivers: topDrivers,
    topRisks,
    expectedRenewals,
    expectedChurn,
    recommendedActions: actions.slice(0, 5),
    projectedMrr30d: {
      value: projected,
      low,
      high,
      status: historyDays < 14 ? "not_verified" : projectedStatus,
    },
  };
}
